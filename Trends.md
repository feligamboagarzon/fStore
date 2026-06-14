# Especificación Técnica y Arquitectura: Sistema Automatizado de Captura de Productos Virales (MVP)

Este documento detalla el diseño de un sistema basado en scripts modulares de Python para la recolección, filtrado y validación automatizada de productos con alto potencial de viralidad para dropshipping, priorizando infraestructura de costo cero o herramientas con planes gratuitos amplios.

---

## 1. Arquitectura General del Sistema

El sistema opera bajo un enfoque de **Pipeline de Datos Asíncrono** dividido en cuatro fases secuenciales ejecutadas mediante tareas programadas (Cron jobs locales o GitHub Actions):

[1. Extracción (Apify / Meta)] ➔ [2. Filtrado y Tendencia (Pytrends)] ➔ [3. Validación (RapidAPI)] ➔ [4. Alerta (Telegram)]

### Resumen de Infraestructura Económica (Presupuesto: $0 USD)
- **Extracción de Redes:** Apify Free Tier ($5 USD de crédito mensual de regalo, suficiente para ~10,000 ejecuciones mensuales).
- **Validación de Interés:** `pytrends` (Librería nativa de Python, costo cero).
- **Costo de Proveedores:** AliExpress Data API vía RapidAPI (Plan gratuito: 500 peticiones/mes).
- **Notificaciones:** Telegram Bot API (Completamente gratuito y sin límites transaccionales).

---

## 2. Fase de Extracción: Minería de Datos en Redes Sociales

El objetivo de esta fase es extraer publicaciones con interacciones inusuales en nichos transaccionales.

### Estrategia A: Monitoreo de Tendencias en TikTok Orgánico
Utilizaremos **Apify** y su actor `TikTok Scraper` en su capa gratuita. El script invoca el actor buscando hashtags clave de alta conversión:
- `#tiktokmademebuyit`
- `#amazonfinds`
- `#dropshipping`

```python
import os
from apify_client import ApifyClient

def extraer_tendencias_tiktok():
    # El token se obtiene gratis al crear una cuenta en Apify
    client = ApifyClient(os.getenv("APIFY_TOKEN"))
    
    # Configuración optimizada para no agotar el saldo gratuito
    run_input = {
        "hashtags": ["tiktokmademebuyit", "amazonfinds"],
        "resultsPerPage": 30,
        "shouldDownloadVideos": False,
        "shouldDownloadCovers": False,
        "searchType": "video",
        "timeRange": "week" # Filtrar solo videos subidos esta semana
    }
    
    # Ejecutar el actor de forma asíncrona
    run = client.actor("clockworks/tiktok-scraper").call(global_options={"runInput": run_input})
    
    productos_candidatos = []
    for item in client.dataset(run["defaultDatasetId"]).iterate_items():
        # Extraemos métricas clave de engagement
        productos_candidatos.append({
            "id": item.get("id"),
            "desc": item.get("text"),
            "views": item.get("viewCount", 0),
            "likes": item.get("diggCount", 0),
            "shares": item.get("shareCount", 0),
            "url": item.get("webVideoUrl"),
            "author": item.get("author", {}).get("uniqueId")
        })
    return productos_candidatos