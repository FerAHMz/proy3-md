# Orquesta la generacion de los 8 CSVs en database/data/. Combina las filas
# que aportan gen_grids y gen_irregulares y las escribe con el modulo csv
# estandar de Python (UTF-8, sin BOM, comillado seguro).

import csv
import logging
from pathlib import Path
from typing import Dict, List

import gen_grids
import gen_irregulares

SCRIPT_DIR = Path(__file__).resolve().parent
DATABASE_DIR = SCRIPT_DIR.parent
DATA_DIR = DATABASE_DIR / "data"

# Headers fijos por tabla. El orden define como sale en el CSV.
HEADERS: Dict[str, List[str]] = {
    "rompecabezas": [
        "serial", "nombre", "tematica", "tipo_estructura",
        "total_piezas", "num_figuras", "filas", "columnas",
    ],
    "figuras": [
        "serial", "rompecabezas_serial", "nombre", "num_piezas", "orden_narrativo",
    ],
    "piezas": [
        "serial", "rompecabezas_serial", "tipo", "forma", "presente", "descripcion",
        "fila", "columna", "numero",
        "lado_arriba", "lado_abajo", "lado_izquierda", "lado_derecha",
    ],
    "pertenece_a": ["pieza_serial", "rompecabezas_serial"],
    "parte_de": ["pieza_serial", "figura_serial"],
    "en": ["figura_serial", "rompecabezas_serial"],
    "siguiente": ["from_pieza_serial", "to_pieza_serial"],
    "conecta_con": ["from_pieza_serial", "to_pieza_serial", "lado"],
}

logger = logging.getLogger("gen_csvs")


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )


def merge_rows(
    a: Dict[str, List[dict]], b: Dict[str, List[dict]]
) -> Dict[str, List[dict]]:
    # Une las filas de las tablas presentes en a o en b
    tablas = set(a.keys()) | set(b.keys())
    return {tabla: a.get(tabla, []) + b.get(tabla, []) for tabla in tablas}


def write_csv(path: Path, headers: List[str], rows: List[dict]) -> None:
    # Escribe el CSV con todos los campos como string. Los valores faltantes
    # quedan como cadena vacia (LOAD CSV los convierte a null con CASE WHEN)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({h: row.get(h, "") for h in headers})


def main() -> int:
    configure_logging()
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    combined = merge_rows(gen_grids.build_rows(), gen_irregulares.build_rows())

    # Verifica que no haya tablas inesperadas (typos de claves)
    desconocidas = set(combined.keys()) - set(HEADERS.keys())
    if desconocidas:
        logger.error("Tablas no esperadas: %s", ", ".join(sorted(desconocidas)))
        return 1

    for tabla, headers in HEADERS.items():
        rows = combined.get(tabla, [])
        path = DATA_DIR / f"{tabla}.csv"
        write_csv(path, headers, rows)
        logger.info("%s -> %d filas", path.name, len(rows))

    logger.info("CSVs escritos en %s", DATA_DIR)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
