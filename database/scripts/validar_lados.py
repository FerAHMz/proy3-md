# Valida la consistencia de lados leyendo data/piezas.csv (offline).
# Solo aplica a piezas de grids; las irregulares tienen fila/columna de
# maquetacion pero no lado_*, asi que se ignoran (tipo='irregular').

import csv
import logging
import sys
from pathlib import Path
from typing import Dict, Tuple

SCRIPT_DIR = Path(__file__).resolve().parent
DATABASE_DIR = SCRIPT_DIR.parent
PIEZAS_CSV = DATABASE_DIR / "data" / "piezas.csv"

logger = logging.getLogger("validar_lados")


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )


def cargar_piezas_grids(path: Path) -> Dict[str, Dict[Tuple[int, int], Dict[str, str]]]:
    # Carga solo las filas con fila/columna no vacias y las agrupa por
    # rompecabezas y coordenada
    rcs: Dict[str, Dict[Tuple[int, int], Dict[str, str]]] = {}
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("tipo") == "irregular":
                continue
            if row.get("fila") == "" or row.get("columna") == "":
                continue
            rc_id = row["rompecabezas_serial"]
            coord = (int(row["fila"]), int(row["columna"]))
            rcs.setdefault(rc_id, {})[coord] = row
    return rcs


def validar_grid(rc_id: str, grid: Dict[Tuple[int, int], Dict[str, str]]) -> int:
    # Verifica bordes 'plano' y pares (saliente, abertura) en los vecinos
    filas = max(f for f, _ in grid.keys())
    cols = max(c for _, c in grid.keys())
    logger.info("%s: %d filas x %d columnas = %d piezas", rc_id, filas, cols, len(grid))

    errores = 0
    for (f, c), p in grid.items():
        # Bordes externos siempre deben ser 'plano'
        if f == 1 and p["lado_arriba"] != "plano":
            logger.error(
                "%s (%d,%d) borde superior pero lado_arriba=%s",
                rc_id, f, c, p["lado_arriba"],
            )
            errores += 1
        if f == filas and p["lado_abajo"] != "plano":
            logger.error(
                "%s (%d,%d) borde inferior pero lado_abajo=%s",
                rc_id, f, c, p["lado_abajo"],
            )
            errores += 1
        if c == 1 and p["lado_izquierda"] != "plano":
            logger.error(
                "%s (%d,%d) borde izq pero lado_izquierda=%s",
                rc_id, f, c, p["lado_izquierda"],
            )
            errores += 1
        if c == cols and p["lado_derecha"] != "plano":
            logger.error(
                "%s (%d,%d) borde der pero lado_derecha=%s",
                rc_id, f, c, p["lado_derecha"],
            )
            errores += 1

        # Consistencia horizontal con el vecino de la derecha
        if c < cols:
            vecino = grid[(f, c + 1)]
            par = (p["lado_derecha"], vecino["lado_izquierda"])
            if par not in [("saliente", "abertura"), ("abertura", "saliente")]:
                logger.error(
                    "Consistencia H: %s (%d,%d).der=%s pero (%d,%d).izq=%s",
                    rc_id, f, c, p["lado_derecha"], f, c + 1, vecino["lado_izquierda"],
                )
                errores += 1

        # Consistencia vertical con el vecino de abajo
        if f < filas:
            vecino = grid[(f + 1, c)]
            par = (p["lado_abajo"], vecino["lado_arriba"])
            if par not in [("saliente", "abertura"), ("abertura", "saliente")]:
                logger.error(
                    "Consistencia V: %s (%d,%d).aba=%s pero (%d,%d).arr=%s",
                    rc_id, f, c, p["lado_abajo"], f + 1, c, vecino["lado_arriba"],
                )
                errores += 1

    return errores


def main() -> int:
    configure_logging()

    if not PIEZAS_CSV.exists():
        logger.error("No se encontro el archivo: %s", PIEZAS_CSV)
        logger.error("Corre 'python gen_csvs.py' antes que esto.")
        return 1

    rcs = cargar_piezas_grids(PIEZAS_CSV)
    total_piezas = sum(len(g) for g in rcs.values())
    logger.info("Piezas de grids cargadas: %d (rompecabezas: %d)", total_piezas, len(rcs))

    total_errores = 0
    for rc_id, grid in sorted(rcs.items()):
        total_errores += validar_grid(rc_id, grid)

    logger.info("=" * 60)
    if total_errores == 0:
        logger.info("Total errores: 0. Todos los lados son consistentes.")
        return 0
    logger.error("Total errores: %d", total_errores)
    return 1


if __name__ == "__main__":
    sys.exit(main())
