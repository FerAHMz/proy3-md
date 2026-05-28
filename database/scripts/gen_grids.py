# Define la data de los 4 rompecabezas tipo grid (RC001-RC004) y construye
# las filas que iran a los CSVs compartidos. No escribe archivos por si solo;
# eso lo hace gen_csvs.py.

import logging
import random
from typing import Dict, List, Tuple

# Semilla fija para que el output sea reproducible
RANDOM_SEED = 42

logger = logging.getLogger("gen_grids")

GRIDS = [
    {
        "id": "RC001",
        "nombre": "My Best Puzzle - Animales del Bosque",
        "tematica": "Animales del bosque",
        "filas": 4,
        "columnas": 6,
        "descripciones": {
            (2, 3): "Cabeza del zorro principal",
            (3, 3): "Bufanda del zorro",
            (3, 1): "Cerdito con bufanda",
            (2, 5): "Panda con bufanda",
            (3, 6): "Mapache con bufanda",
            (1, 1): "Esquina superior izquierda - árbol",
            (1, 6): "Esquina superior derecha - cielo",
            (4, 1): "Esquina inferior izquierda - pasto",
            (4, 6): "Esquina inferior derecha - arbusto",
        },
    },
    {
        "id": "RC002",
        "nombre": "Dinosaurios Prehistóricos",
        "tematica": "Dinosaurios",
        "filas": 4,
        "columnas": 6,
        "descripciones": {
            (2, 3): "T-Rex rugiendo",
            (3, 2): "Triceratops pastando",
            (2, 5): "Pterodáctilo volando",
            (3, 5): "Volcán humeante",
            (1, 3): "Cielo prehistórico",
        },
    },
    {
        "id": "RC003",
        "nombre": "Espacio y Planetas",
        "tematica": "Espacio",
        "filas": 4,
        "columnas": 6,
        "descripciones": {
            (1, 2): "Astronauta saludando",
            (2, 1): "Tierra azul",
            (2, 3): "Marte rojo",
            (3, 2): "Cohete despegando",
            (4, 1): "Estrellas brillantes",
            (4, 3): "Luna sonriente",
        },
    },
    {
        "id": "RC004",
        "nombre": "Vehículos Divertidos",
        "tematica": "Vehículos",
        "filas": 4,
        "columnas": 6,
        "descripciones": {
            (2, 3): "Carro rojo de carreras",
            (3, 2): "Camión amarillo",
            (1, 4): "Avión surcando el cielo",
            (3, 4): "Bicicleta colorida",
            (4, 3): "Barco navegando",
        },
    },
]


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )


def determinar_tipo_pieza(fila: int, columna: int, filas: int, columnas: int) -> str:
    # esquina si toca dos bordes, borde si toca uno, interior en otro caso
    en_borde_f = fila == 1 or fila == filas
    en_borde_c = columna == 1 or columna == columnas
    if en_borde_f and en_borde_c:
        return "esquina"
    if en_borde_f or en_borde_c:
        return "borde"
    return "interior"


def generar_lados(filas: int, columnas: int) -> Dict[Tuple[int, int], Dict[str, str]]:
    # Inicializa todos los lados en 'plano' (asi los bordes ya quedan correctos)
    lados: Dict[Tuple[int, int], Dict[str, str]] = {}
    for f in range(1, filas + 1):
        for c in range(1, columnas + 1):
            lados[(f, c)] = {
                "lado_arriba": "plano",
                "lado_abajo": "plano",
                "lado_izquierda": "plano",
                "lado_derecha": "plano",
            }

    # Para cada arista interna horizontal asigna saliente/abertura coherente
    for f in range(1, filas + 1):
        for c in range(1, columnas):
            if random.random() < 0.5:
                lados[(f, c)]["lado_derecha"] = "saliente"
                lados[(f, c + 1)]["lado_izquierda"] = "abertura"
            else:
                lados[(f, c)]["lado_derecha"] = "abertura"
                lados[(f, c + 1)]["lado_izquierda"] = "saliente"

    # Misma logica para aristas verticales
    for f in range(1, filas):
        for c in range(1, columnas + 1):
            if random.random() < 0.5:
                lados[(f, c)]["lado_abajo"] = "saliente"
                lados[(f + 1, c)]["lado_arriba"] = "abertura"
            else:
                lados[(f, c)]["lado_abajo"] = "abertura"
                lados[(f + 1, c)]["lado_arriba"] = "saliente"

    return lados


def build_rows() -> Dict[str, List[dict]]:
    # Devuelve las filas para las 4 tablas que aporta el grupo de grids:
    # rompecabezas, piezas, pertenece_a, conecta_con
    random.seed(RANDOM_SEED)

    rompecabezas: List[dict] = []
    piezas: List[dict] = []
    pertenece_a: List[dict] = []
    conecta_con: List[dict] = []

    for grid in GRIDS:
        filas, columnas = grid["filas"], grid["columnas"]
        total = filas * columnas
        descripciones = grid.get("descripciones", {})
        lados = generar_lados(filas, columnas)

        rompecabezas.append({
            "id": grid["id"],
            "nombre": grid["nombre"],
            "tematica": grid["tematica"],
            "tipo_estructura": "grid",
            "total_piezas": total,
            "num_figuras": 1,
            "filas": filas,
            "columnas": columnas,
        })

        for f in range(1, filas + 1):
            for c in range(1, columnas + 1):
                pid = f"{grid['id']}-P{f:02d}-{c:02d}"
                tipo = determinar_tipo_pieza(f, c, filas, columnas)
                lado = lados[(f, c)]
                desc = descripciones.get((f, c), f"Pieza ({f},{c})")

                piezas.append({
                    "id": pid,
                    "rompecabezas_id": grid["id"],
                    "tipo": tipo,
                    "forma": "rectangular",
                    "presente": "true",
                    "descripcion": desc,
                    "fila": f,
                    "columna": c,
                    "numero": "",
                    "lado_arriba": lado["lado_arriba"],
                    "lado_abajo": lado["lado_abajo"],
                    "lado_izquierda": lado["lado_izquierda"],
                    "lado_derecha": lado["lado_derecha"],
                })

                pertenece_a.append({
                    "pieza_id": pid,
                    "rompecabezas_id": grid["id"],
                })

        # CONECTA_CON horizontal (cada pieza con su vecino de la derecha)
        for f in range(1, filas + 1):
            for c in range(1, columnas):
                conecta_con.append({
                    "from_pieza_id": f"{grid['id']}-P{f:02d}-{c:02d}",
                    "to_pieza_id": f"{grid['id']}-P{f:02d}-{c+1:02d}",
                    "lado": "derecha",
                })

        # CONECTA_CON vertical (cada pieza con su vecino de abajo)
        for f in range(1, filas):
            for c in range(1, columnas + 1):
                conecta_con.append({
                    "from_pieza_id": f"{grid['id']}-P{f:02d}-{c:02d}",
                    "to_pieza_id": f"{grid['id']}-P{f+1:02d}-{c:02d}",
                    "lado": "abajo",
                })

    return {
        "rompecabezas": rompecabezas,
        "piezas": piezas,
        "pertenece_a": pertenece_a,
        "conecta_con": conecta_con,
    }


def main() -> int:
    # Sanity check: imprime cuantas filas aporta cada tabla
    configure_logging()
    rows = build_rows()
    logger.info("Filas generadas por gen_grids:")
    for tabla, filas in rows.items():
        logger.info("  %s: %d", tabla, len(filas))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
