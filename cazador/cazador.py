#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════════════╗
║  🎯  CAZADOR DE TENDENCIAS — Pipeline de Productos Virales     ║
║  Versión:  1.0.0-MVP                                           ║
║  Autor:    feli                                                 ║
║  Objetivo: Rastrear, filtrar y validar productos virales        ║
║            para dropshipping usando APIs gratuitas.             ║
╚══════════════════════════════════════════════════════════════════╝

Pipeline secuencial de 4 fases:
  [1. Extracción (Apify/TikTok)]
  [2. Filtrado y Tendencia (Pytrends/Google Trends)]
  [3. Validación de Proveedor (RapidAPI/AliExpress)]
  [4. Alerta (Telegram Bot)]

Uso:
  1. Copia .env.example → .env y rellena tus tokens.
  2. pip install -r requirements.txt
  3. python cazador.py
"""

# ============================================================
# IMPORTS
# ============================================================
import os
import sys
import time
import logging
from datetime import datetime
from typing import Optional

# Carga de variables de entorno
from dotenv import load_dotenv

# Fase 1: Extracción
from apify_client import ApifyClient

# Fase 2: Filtrado de tendencias
from pytrends.request import TrendReq

# Fase 3: Validación de proveedor
import requests

# Fase 4: Alertas
import telegram
import asyncio

# Utilidades de consola
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import track

# ============================================================
# CONFIGURACIÓN INICIAL
# ============================================================
load_dotenv(override=True)
console = Console()

# Configurar logging con formato legible
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s │ %(levelname)-8s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("cazador")

# Umbrales configurables desde .env
MIN_VIEWS = int(os.getenv("MIN_VIEWS_THRESHOLD", "500000"))
MIN_ENGAGEMENT = int(os.getenv("MIN_ENGAGEMENT_THRESHOLD", "10000"))
RESULTS_PER_PAGE = int(os.getenv("TIKTOK_RESULTS_PER_PAGE", "30"))


# ============================================================
# FASE 1: EXTRACCIÓN — Minería de datos en TikTok vía Apify
# ============================================================
def extraer_tendencias_tiktok() -> list[dict]:
    """
    Extrae publicaciones virales de TikTok usando el actor
    'clockworks/tiktok-scraper' de Apify (Free Tier).

    Busca hashtags de alta conversión y devuelve una lista de
    candidatos con métricas de engagement.

    Returns:
        Lista de diccionarios con datos de cada video candidato.
        Retorna lista vacía si hay un error con la API.
    """
    logger.info("🔍 FASE 1: Iniciando extracción de tendencias en TikTok...")

    apify_token = os.getenv("APIFY_TOKEN")
    if not apify_token:
        logger.error("❌ APIFY_TOKEN no configurado. Revisa tu archivo .env")
        return []

    actor_id = os.getenv("APIFY_TIKTOK_ACTOR_ID", "clockworks/tiktok-scraper")

    # Hashtags de alto valor transaccional para dropshipping
    hashtags_objetivo = [
        "tiktokmademebuyit",
        "amazonfinds",
        "dropshipping",
    ]

    try:
        client = ApifyClient(apify_token)

        # Configuración optimizada para no agotar el crédito gratuito ($5/mes)
        run_input = {
            "hashtags": hashtags_objetivo,
            "resultsPerPage": RESULTS_PER_PAGE,
            "shouldDownloadVideos": False,    # Ahorra créditos: no descargamos video
            "shouldDownloadCovers": False,    # Ahorra créditos: no descargamos covers
            "searchType": "video",
            "timeRange": "week",              # Solo videos de esta semana
        }

        logger.info(
            f"   Buscando hashtags: {', '.join(f'#{h}' for h in hashtags_objetivo)}"
        )
        logger.info(f"   Resultados por página: {RESULTS_PER_PAGE}")

        # Ejecutar el actor — esto puede tardar 30-120 segundos
        run = client.actor(actor_id).call(run_input=run_input)

        # En apify-client v3+, 'run' es un objeto y usa snake_case
        dataset_id = None
        if hasattr(run, "default_dataset_id"):
            dataset_id = run.default_dataset_id
        elif isinstance(run, dict):
            dataset_id = run.get("defaultDatasetId") or run.get("default_dataset_id")

        if not dataset_id:
            logger.warning("⚠️  Apify no devolvió un dataset válido.")
            return []

        # Procesar resultados del dataset
        productos_candidatos = []
        dataset = client.dataset(dataset_id)

        for item in dataset.iterate_items():
            candidato = {
                "id": item.get("id", "sin-id"),
                "descripcion": item.get("text", "Sin descripción"),
                "vistas": item.get("playCount", 0),
                "likes": item.get("diggCount", 0),
                "shares": item.get("shareCount", 0),
                "comentarios": item.get("commentCount", 0),
                "url": item.get("webVideoUrl", ""),
                "autor": item.get("author", {}).get("uniqueId", "desconocido"),
                "fecha_creacion": item.get("createTime", ""),
                "engagement_total": (
                    item.get("diggCount", 0)
                    + item.get("shareCount", 0)
                    + item.get("commentCount", 0)
                ),
            }
            productos_candidatos.append(candidato)

        logger.info(
            f"✅ Extracción completada: {len(productos_candidatos)} videos encontrados"
        )
        return productos_candidatos

    except Exception as e:
        logger.error(f"❌ Error en extracción de TikTok: {type(e).__name__}: {e}")
        return []


# ============================================================
# FASE 2: FILTRADO — Validar tendencia con Google Trends
# ============================================================
def filtrar_por_tendencia(productos: list[dict]) -> list[dict]:
    """
    Filtra la lista de productos candidatos aplicando dos criterios:

    1. Umbral de métricas: Descarta videos que no superen los mínimos
       de vistas y engagement configurados en .env.
    2. Validación Google Trends: Para cada producto que pase el filtro
       de métricas, verifica si alguna keyword de su descripción tiene
       interés creciente en Google Trends (últimos 7 días).

    Args:
        productos: Lista de candidatos de la Fase 1.

    Returns:
        Lista filtrada de productos con tendencia confirmada.
    """
    logger.info("📊 FASE 2: Filtrando productos por tendencia...")

    if not productos:
        logger.warning("⚠️  No hay productos para filtrar. Fase 2 omitida.")
        return []

    # --- Paso 2a: Filtro por métricas de engagement ---
    productos_filtrados = []
    for p in productos:
        if p["vistas"] >= MIN_VIEWS and p["engagement_total"] >= MIN_ENGAGEMENT:
            productos_filtrados.append(p)

    logger.info(
        f"   Filtro de métricas: {len(productos_filtrados)}/{len(productos)} "
        f"pasaron (min. {MIN_VIEWS:,} vistas, {MIN_ENGAGEMENT:,} engagement)"
    )

    if not productos_filtrados:
        logger.info("   Ningún producto superó los umbrales. Fase 2 terminada.")
        return []

    # --- Paso 2b: Validación con Google Trends ---
    proxy = os.getenv("PYTRENDS_PROXY", "").strip()
    proxies = [proxy] if proxy else []

    try:
        pytrends = TrendReq(
            hl="es",           # Idioma de las tendencias
            tz=360,            # Offset de zona horaria (CST = UTC-6)
            retries=3,
            backoff_factor=1.5,
            proxies=proxies if proxies else None,
        )
    except Exception as e:
        logger.error(f"❌ Error inicializando Pytrends: {e}")
        # Si Pytrends falla, devolvemos los productos que pasaron el filtro de métricas
        logger.info("   Retornando productos sin validación de tendencia.")
        return productos_filtrados

    productos_trending = []

    for producto in track(
        productos_filtrados, description="   Verificando tendencias..."
    ):
        # Extraer keywords de la descripción del video
        desc = producto.get("descripcion", "")
        keywords = _extraer_keywords(desc)

        if not keywords:
            continue

        try:
            # Construir payload de Google Trends (máximo 5 keywords por consulta)
            kw_list = keywords[:5]
            pytrends.build_payload(
                kw_list=kw_list,
                timeframe="now 7-d",  # Últimos 7 días
                geo="",               # Global
            )

            # Obtener interés a lo largo del tiempo
            interest_df = pytrends.interest_over_time()

            if interest_df.empty:
                continue

            # Verificar si alguna keyword tiene tendencia creciente
            for kw in kw_list:
                if kw in interest_df.columns:
                    valores = interest_df[kw].values
                    # Tendencia creciente: el promedio de la segunda mitad
                    # supera al de la primera mitad
                    mitad = len(valores) // 2
                    if mitad > 0:
                        promedio_inicio = valores[:mitad].mean()
                        promedio_final = valores[mitad:].mean()

                        if promedio_final > promedio_inicio:
                            producto["keyword_trending"] = kw
                            producto["trend_score"] = round(
                                promedio_final - promedio_inicio, 2
                            )
                            productos_trending.append(producto)
                            logger.debug(
                                f"   📈 Trending: '{kw}' "
                                f"({promedio_inicio:.0f} → {promedio_final:.0f})"
                            )
                            break  # Una keyword basta para validar

            # Respetar rate limits de Google Trends (no es una API oficial)
            time.sleep(2)

        except Exception as e:
            logger.warning(f"⚠️  Error consultando Trends para '{keywords[:2]}': {e}")
            time.sleep(5)  # Backoff extra si hay error
            continue

    logger.info(
        f"✅ Filtrado completado: {len(productos_trending)} productos con tendencia confirmada"
    )
    return productos_trending


def _extraer_keywords(texto: str) -> list[str]:
    """
    Extrae keywords relevantes de la descripción de un video.
    Filtra hashtags, stopwords y palabras muy cortas.

    Args:
        texto: Descripción del video de TikTok.

    Returns:
        Lista de keywords limpias (máximo 5).
    """
    if not texto:
        return []

    # Stopwords comunes en inglés y español (lista reducida para MVP)
    stopwords = {
        "the", "a", "an", "is", "it", "in", "on", "at", "to", "for", "of",
        "and", "or", "but", "not", "this", "that", "with", "you", "your",
        "i", "me", "my", "we", "our", "they", "el", "la", "los", "las",
        "de", "en", "con", "por", "para", "un", "una", "es", "son", "del",
        "que", "como", "más", "muy", "también", "se", "su", "al",
    }

    # Limpiar: quitar hashtags, menciones y caracteres especiales
    palabras = texto.lower().split()
    keywords = []

    for palabra in palabras:
        # Ignorar hashtags y menciones
        if palabra.startswith("#") or palabra.startswith("@"):
            # Pero el contenido del hashtag SÍ puede ser útil
            clean = palabra.lstrip("#@")
            if len(clean) > 3 and clean not in stopwords:
                keywords.append(clean)
        else:
            # Limpiar caracteres no alfanuméricos
            clean = "".join(c for c in palabra if c.isalnum())
            if len(clean) > 3 and clean not in stopwords:
                keywords.append(clean)

    # Retornar solo las primeras 5 únicas
    seen = set()
    unique = []
    for kw in keywords:
        if kw not in seen:
            seen.add(kw)
            unique.append(kw)
        if len(unique) >= 5:
            break

    return unique


# ============================================================
# FASE 3: VALIDACIÓN — Búsqueda de proveedor en AliExpress
# ============================================================
def buscar_proveedor_aliexpress(productos: list[dict]) -> list[dict]:
    """
    Para cada producto validado con tendencia, busca un proveedor
    en AliExpress a través de RapidAPI (Plan gratuito: 500 req/mes).

    Agrega información del proveedor (precio, rating, URL, envío)
    al diccionario de cada producto.

    Args:
        productos: Lista de productos que pasaron Fase 1 y 2.

    Returns:
        Lista de productos enriquecida con datos de proveedor.
        Productos sin proveedor encontrado se mantienen pero sin datos extra.
    """
    logger.info("🏭 FASE 3: Buscando proveedores en AliExpress...")

    if not productos:
        logger.warning("⚠️  No hay productos para validar. Fase 3 omitida.")
        return []

    rapidapi_key = os.getenv("RAPIDAPI_KEY")
    rapidapi_host = os.getenv(
        "RAPIDAPI_ALIEXPRESS_HOST", "aliexpress-datahub.p.rapidapi.com"
    )

    if not rapidapi_key:
        logger.error("❌ RAPIDAPI_KEY no configurado. Revisa tu archivo .env")
        logger.info("   Retornando productos sin datos de proveedor.")
        return productos

    headers = {
        "X-RapidAPI-Key": rapidapi_key,
        "X-RapidAPI-Host": rapidapi_host,
    }

    productos_validados = []
    peticiones_realizadas = 0
    MAX_PETICIONES = 50  # Límite de seguridad para no agotar las 500 req/mes

    for producto in track(
        productos, description="   Consultando AliExpress..."
    ):
        if peticiones_realizadas >= MAX_PETICIONES:
            logger.warning(
                f"⚠️  Límite de seguridad alcanzado ({MAX_PETICIONES} peticiones). "
                f"Deteniendo búsqueda."
            )
            # Los restantes se agregan sin datos de proveedor
            productos_validados.append(producto)
            continue

        # Usar la keyword trending como término de búsqueda
        query = producto.get("keyword_trending", "")
        if not query:
            # Fallback: usar las primeras palabras de la descripción
            desc_words = producto.get("descripcion", "").split()[:3]
            query = " ".join(desc_words)

        if not query:
            productos_validados.append(producto)
            continue

        try:
            url = f"https://{rapidapi_host}/api/products/search"
            params = {
                "query": query,
                "page": "1",
                "sort_by": "default",
                "currency": "USD",
            }

            response = requests.get(url, headers=headers, params=params, timeout=15)
            peticiones_realizadas += 1

            if response.status_code == 200:
                data = response.json()
                items = data.get("result", {}).get("resultList", [])

                if items:
                    # Tomar el primer resultado como proveedor principal
                    top_item = items[0].get("item", {})
                    producto["proveedor"] = {
                        "titulo": top_item.get("title", "N/A"),
                        "precio_usd": top_item.get(
                            "sku", {}).get("def", {}).get("price", "N/A"
                        ),
                        "rating": top_item.get("averageStar", "N/A"),
                        "ventas": top_item.get("trade", {}).get("tradeDesc", "N/A"),
                        "url": f"https://aliexpress.com/item/{top_item.get('itemId', '')}.html",
                        "envio_gratis": top_item.get(
                            "logisticsDesc", ""
                        ).lower().count("free") > 0,
                    }
                    logger.debug(
                        f"   ✅ Proveedor encontrado para '{query}': "
                        f"{producto['proveedor']['titulo'][:50]}"
                    )
                else:
                    logger.debug(f"   ❌ Sin resultados en AliExpress para '{query}'")
                    producto["proveedor"] = None
            elif response.status_code == 429:
                logger.warning("⚠️  Rate limit alcanzado en RapidAPI. Pausando...")
                producto["proveedor"] = None
                time.sleep(10)
            else:
                logger.warning(
                    f"⚠️  RapidAPI respondió con status {response.status_code} "
                    f"para '{query}'"
                )
                producto["proveedor"] = None

            productos_validados.append(producto)

            # Respetar rate limits
            time.sleep(1)

        except requests.exceptions.Timeout:
            logger.warning(f"⚠️  Timeout consultando AliExpress para '{query}'")
            producto["proveedor"] = None
            productos_validados.append(producto)
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error de red consultando AliExpress: {e}")
            producto["proveedor"] = None
            productos_validados.append(producto)
        except Exception as e:
            logger.error(f"❌ Error inesperado en Fase 3: {type(e).__name__}: {e}")
            producto["proveedor"] = None
            productos_validados.append(producto)

    logger.info(
        f"✅ Validación completada: {peticiones_realizadas} consultas a AliExpress realizadas"
    )

    # Contar productos con proveedor válido
    con_proveedor = sum(1 for p in productos_validados if p.get("proveedor"))
    logger.info(f"   {con_proveedor}/{len(productos_validados)} tienen proveedor")

    return productos_validados


# ============================================================
# FASE 4: ALERTA — Envío de notificación a Telegram
# ============================================================
async def _enviar_mensaje_telegram(bot_token: str, chat_id: str, mensaje: str) -> bool:
    """
    Envía un mensaje formateado a un chat de Telegram.

    Args:
        bot_token: Token del bot de Telegram.
        chat_id: ID del chat o canal destino.
        mensaje: Texto del mensaje en formato HTML.

    Returns:
        True si el mensaje se envió correctamente.
    """
    try:
        bot = telegram.Bot(token=bot_token)
        await bot.send_message(
            chat_id=chat_id,
            text=mensaje,
            parse_mode="HTML",
            disable_web_page_preview=False,
        )
        return True
    except Exception as e:
        logger.error(f"❌ Error enviando mensaje a Telegram: {e}")
        return False


def enviar_alertas_telegram(productos: list[dict]) -> int:
    """
    Envía una alerta individual a Telegram por cada producto validado
    que tenga proveedor encontrado.

    El mensaje incluye:
    - 🎯 Datos del video viral (vistas, likes, shares)
    - 📈 Keyword con tendencia confirmada
    - 🏭 Datos del proveedor (precio, rating, URL)
    - 🔗 Link al video original

    Args:
        productos: Lista de productos de la Fase 3.

    Returns:
        Número de alertas enviadas exitosamente.
    """
    logger.info("📨 FASE 4: Enviando alertas a Telegram...")

    if not productos:
        logger.warning("⚠️  No hay productos para reportar. Fase 4 omitida.")
        return 0

    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")

    if not bot_token or not chat_id:
        logger.error(
            "❌ TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados. "
            "Revisa tu archivo .env"
        )
        _imprimir_resumen_consola(productos)
        return 0

    alertas_enviadas = 0

    for producto in productos:
        # Solo alertar productos con proveedor encontrado
        proveedor = producto.get("proveedor")

        # Construir mensaje formateado en HTML
        mensaje = _formatear_mensaje_alerta(producto, proveedor)

        try:
            exito = asyncio.run(
                _enviar_mensaje_telegram(bot_token, chat_id, mensaje)
            )
            if exito:
                alertas_enviadas += 1
                logger.debug(f"   📨 Alerta enviada: {producto.get('id', 'N/A')}")

            # Telegram permite ~30 msg/seg, pero mejor ser conservador
            time.sleep(1)

        except Exception as e:
            logger.error(f"❌ Error en envío de alerta: {e}")
            continue

    logger.info(f"✅ {alertas_enviadas}/{len(productos)} alertas enviadas a Telegram")

    # Siempre imprimir resumen en consola como respaldo
    _imprimir_resumen_consola(productos)

    return alertas_enviadas


def _formatear_mensaje_alerta(producto: dict, proveedor: Optional[dict]) -> str:
    """
    Genera un mensaje HTML formateado para Telegram.

    Args:
        producto: Diccionario con datos del producto.
        proveedor: Diccionario con datos del proveedor (puede ser None).

    Returns:
        String con el mensaje formateado en HTML.
    """
    # Cabecera
    msg = "🎯 <b>PRODUCTO VIRAL DETECTADO</b>\n"
    msg += "━━━━━━━━━━━━━━━━━━━━━━━\n\n"

    # Datos del video
    msg += f"📱 <b>Video TikTok</b>\n"
    msg += f"   👤 Autor: @{producto.get('autor', 'N/A')}\n"
    msg += f"   👁️ Vistas: {producto.get('vistas', 0):,}\n"
    msg += f"   ❤️ Likes: {producto.get('likes', 0):,}\n"
    msg += f"   🔄 Shares: {producto.get('shares', 0):,}\n"
    msg += f"   💬 Comentarios: {producto.get('comentarios', 0):,}\n"
    msg += f"   🔗 <a href=\"{producto.get('url', '#')}\">Ver video</a>\n\n"

    # Tendencia
    kw = producto.get("keyword_trending", "N/A")
    score = producto.get("trend_score", 0)
    msg += f"📈 <b>Tendencia Google</b>\n"
    msg += f"   Keyword: <code>{kw}</code>\n"
    msg += f"   Score: +{score}\n\n"

    # Proveedor
    if proveedor:
        msg += f"🏭 <b>Proveedor AliExpress</b>\n"
        msg += f"   📦 {proveedor.get('titulo', 'N/A')[:80]}\n"
        msg += f"   💰 Precio: ${proveedor.get('precio_usd', 'N/A')} USD\n"
        msg += f"   ⭐ Rating: {proveedor.get('rating', 'N/A')}\n"
        msg += f"   📊 Ventas: {proveedor.get('ventas', 'N/A')}\n"
        envio = "✅ Sí" if proveedor.get("envio_gratis") else "❌ No"
        msg += f"   🚚 Envío gratis: {envio}\n"
        msg += f"   🔗 <a href=\"{proveedor.get('url', '#')}\">Ver en AliExpress</a>\n\n"
    else:
        msg += "🏭 <b>Proveedor:</b> No encontrado en AliExpress\n\n"

    # Pie
    msg += "━━━━━━━━━━━━━━━━━━━━━━━\n"
    msg += f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
    msg += "🤖 Cazador de Tendencias v1.0"

    return msg


def _imprimir_resumen_consola(productos: list[dict]) -> None:
    """
    Imprime un resumen visual en consola usando Rich.
    Sirve como respaldo cuando Telegram no está configurado.
    """
    if not productos:
        return

    table = Table(
        title="🎯 Resumen de Productos Detectados",
        show_header=True,
        header_style="bold magenta",
    )
    table.add_column("ID", style="dim", width=12)
    table.add_column("Autor", style="cyan")
    table.add_column("Vistas", justify="right", style="green")
    table.add_column("Engagement", justify="right", style="yellow")
    table.add_column("Keyword", style="bold blue")
    table.add_column("Proveedor", style="white")
    table.add_column("Precio", justify="right", style="green bold")

    for p in productos:
        proveedor = p.get("proveedor", {})
        table.add_row(
            str(p.get("id", "N/A"))[:12],
            f"@{p.get('autor', 'N/A')}",
            f"{p.get('vistas', 0):,}",
            f"{p.get('engagement_total', 0):,}",
            p.get("keyword_trending", "—"),
            (proveedor.get("titulo", "No encontrado")[:30] if proveedor else "—"),
            (f"${proveedor.get('precio_usd', '—')}" if proveedor else "—"),
        )

    console.print()
    console.print(table)
    console.print()


# ============================================================
# ORQUESTADOR PRINCIPAL
# ============================================================
def main():
    """
    Función principal que ejecuta el pipeline completo de 4 fases
    de forma secuencial. Si una fase falla, el pipeline se detiene
    de forma elegante e informa el estado.
    """
    inicio = time.time()

    # Banner de inicio
    console.print(
        Panel.fit(
            "[bold white]🎯 CAZADOR DE TENDENCIAS[/]\n"
            "[dim]Pipeline de Productos Virales para Dropshipping[/]\n"
            f"[dim]{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}[/]",
            border_style="bright_cyan",
        )
    )

    # Verificar que al menos el token de Apify esté configurado
    if not os.getenv("APIFY_TOKEN"):
        console.print(
            "\n[bold red]⛔ Error crítico:[/] No se encontró el archivo .env "
            "o APIFY_TOKEN está vacío.\n"
            "[dim]Ejecuta: cp .env.example .env y rellena tus tokens.[/]\n"
        )
        sys.exit(1)

    # ── FASE 1: Extracción ──────────────────────────────────
    console.print("\n[bold cyan]━━━ FASE 1/4: EXTRACCIÓN ━━━[/]")
    productos_raw = extraer_tendencias_tiktok()

    if not productos_raw:
        console.print(
            "[yellow]⚠️  No se obtuvieron productos. "
            "Verifica tu token de Apify y tu conexión.[/]"
        )
        _mostrar_resumen_final(inicio, 0, 0, 0, 0)
        return

    console.print(f"[green]   → {len(productos_raw)} videos extraídos[/]")

    # ── FASE 2: Filtrado por tendencia ──────────────────────
    console.print("\n[bold cyan]━━━ FASE 2/4: FILTRADO ━━━[/]")
    productos_trending = filtrar_por_tendencia(productos_raw)

    if not productos_trending:
        console.print(
            "[yellow]⚠️  Ningún producto superó los filtros de tendencia.[/]\n"
            f"[dim]   Umbrales: {MIN_VIEWS:,} vistas / {MIN_ENGAGEMENT:,} engagement[/]"
        )
        _mostrar_resumen_final(inicio, len(productos_raw), 0, 0, 0)
        return

    console.print(f"[green]   → {len(productos_trending)} productos con tendencia[/]")

    # ── FASE 3: Validación de proveedor ─────────────────────
    console.print("\n[bold cyan]━━━ FASE 3/4: VALIDACIÓN ━━━[/]")
    productos_validados = buscar_proveedor_aliexpress(productos_trending)
    con_proveedor = sum(1 for p in productos_validados if p.get("proveedor"))

    console.print(
        f"[green]   → {con_proveedor}/{len(productos_validados)} "
        f"con proveedor encontrado[/]"
    )

    # ── FASE 4: Alertas ─────────────────────────────────────
    console.print("\n[bold cyan]━━━ FASE 4/4: ALERTAS ━━━[/]")
    alertas = enviar_alertas_telegram(productos_validados)

    # ── Resumen final ───────────────────────────────────────
    _mostrar_resumen_final(
        inicio, len(productos_raw), len(productos_trending), con_proveedor, alertas
    )


def _mostrar_resumen_final(
    inicio: float,
    extraidos: int,
    trending: int,
    con_proveedor: int,
    alertas: int,
) -> None:
    """Muestra un panel con el resumen de ejecución del pipeline."""
    duracion = time.time() - inicio
    minutos = int(duracion // 60)
    segundos = int(duracion % 60)

    resumen = (
        f"[bold]📊 Resumen del Pipeline[/]\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"  📥 Videos extraídos:     {extraidos}\n"
        f"  📈 Con tendencia:        {trending}\n"
        f"  🏭 Con proveedor:        {con_proveedor}\n"
        f"  📨 Alertas enviadas:     {alertas}\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"  ⏱️  Duración:            {minutos}m {segundos}s\n"
        f"  ⏰ Finalizado:          {datetime.now().strftime('%H:%M:%S')}"
    )

    console.print()
    console.print(Panel(resumen, border_style="bright_green", title="✅ Completado"))
    console.print()


# ============================================================
# PUNTO DE ENTRADA
# ============================================================
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print("\n[yellow]⚠️  Pipeline interrumpido por el usuario.[/]")
        sys.exit(0)
    except Exception as e:
        logger.critical(f"💀 Error fatal no controlado: {type(e).__name__}: {e}")
        console.print(
            f"\n[bold red]💀 Error fatal:[/] {e}\n"
            "[dim]Revisa los logs para más detalles.[/]"
        )
        sys.exit(1)
