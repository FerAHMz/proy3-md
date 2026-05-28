# Define la data de los 4 rompecabezas irregulares (RC005-RC008) y construye
# las filas que iran a los CSVs compartidos. No escribe archivos por si solo;
# eso lo hace gen_csvs.py.

import logging
from typing import Dict, List

logger = logging.getLogger("gen_irregulares")

# Estructura por rompecabezas:
#   - meta: nombre, tematica, tipo_estructura, total_piezas, num_figuras
#   - figuras: lista de figuras (vacia si no aplica)
#   - piezas: lista con id, descripcion, numero (opcional), figura (opcional)
#     y fila/columna (posicion de maquetacion en la rejilla compartida del
#     rompecabezas; fila crece hacia abajo, columna hacia la derecha)
#   - siguiente: pares ordenados (from, to) de la relacion SIGUIENTE
#   - conecta_con: tripletas (from, to, lado) de la relacion CONECTA_CON
#     donde 'lado' indica donde queda B respecto de A
IRREGULARES = [
    {
        "id": "RC005",
        "nombre": "3 Zorros de Madera",
        "tematica": "Zorros",
        "tipo_estructura": "figura_libre",
        "total_piezas": 10,
        "num_figuras": 3,
        "figuras": [
            {"id": "RC005-F1", "nombre": "Zorro grande durmiendo", "num_piezas": 4, "orden_narrativo": 1},
            {"id": "RC005-F2", "nombre": "Zorro mediano",          "num_piezas": 3, "orden_narrativo": 2},
            {"id": "RC005-F3", "nombre": "Zorro pequeño",          "num_piezas": 3, "orden_narrativo": 3},
        ],
        "piezas": [
            {"id": "RC005-P01", "fila": 2, "columna": 2, "descripcion": "Cabeza zorro grande",      "figura": "RC005-F1"},
            {"id": "RC005-P02", "fila": 3, "columna": 2, "descripcion": "Cuerpo zorro grande",      "figura": "RC005-F1"},
            {"id": "RC005-P03", "fila": 4, "columna": 2, "descripcion": "Cola zorro grande (parte 1)", "figura": "RC005-F1"},
            {"id": "RC005-P04", "fila": 4, "columna": 1, "descripcion": "Cola zorro grande (parte 2)", "figura": "RC005-F1"},
            {"id": "RC005-P05", "fila": 1, "columna": 3, "descripcion": "Cabeza zorro mediano",     "figura": "RC005-F2"},
            {"id": "RC005-P06", "fila": 2, "columna": 3, "descripcion": "Cuerpo zorro mediano",     "figura": "RC005-F2"},
            {"id": "RC005-P07", "fila": 3, "columna": 3, "descripcion": "Cola zorro mediano",       "figura": "RC005-F2"},
            {"id": "RC005-P08", "fila": 2, "columna": 4, "descripcion": "Cabeza zorro pequeño",     "figura": "RC005-F3"},
            {"id": "RC005-P09", "fila": 3, "columna": 4, "descripcion": "Cuerpo zorro pequeño",     "figura": "RC005-F3"},
            {"id": "RC005-P10", "fila": 4, "columna": 5, "descripcion": "Cola zorro pequeño",       "figura": "RC005-F3"},
        ],
        "siguiente": [],
        "conecta_con": [
            ("RC005-P01", "RC005-P02", "abajo"),
            ("RC005-P02", "RC005-P03", "abajo"),
            ("RC005-P03", "RC005-P04", "izquierda"),
            ("RC005-P05", "RC005-P06", "abajo"),
            ("RC005-P06", "RC005-P07", "abajo"),
            ("RC005-P08", "RC005-P09", "abajo"),
            ("RC005-P09", "RC005-P10", "derecha"),
        ],
    },
    {
        "id": "RC006",
        "nombre": "Pterodáctilo Numerado",
        "tematica": "Dinosaurio",
        "tipo_estructura": "secuencial_numerado",
        "total_piezas": 10,
        "num_figuras": 1,
        "figuras": [],
        "piezas": [
            {"id": "RC006-P01", "numero": 1,  "fila": 1, "columna": 3, "descripcion": "Cabeza"},
            {"id": "RC006-P02", "numero": 2,  "fila": 2, "columna": 1, "descripcion": "Fin ala izquierda"},
            {"id": "RC006-P03", "numero": 3,  "fila": 2, "columna": 2, "descripcion": "Ala izquierda"},
            {"id": "RC006-P04", "numero": 4,  "fila": 2, "columna": 3, "descripcion": "Cuello"},
            {"id": "RC006-P05", "numero": 5,  "fila": 3, "columna": 3, "descripcion": "Cuerpo"},
            {"id": "RC006-P06", "numero": 6,  "fila": 2, "columna": 4, "descripcion": "Ala derecha"},
            {"id": "RC006-P07", "numero": 7,  "fila": 2, "columna": 5, "descripcion": "Fin ala derecha"},
            {"id": "RC006-P08", "numero": 8,  "fila": 4, "columna": 3, "descripcion": "Pata"},
            {"id": "RC006-P09", "numero": 9,  "fila": 3, "columna": 4, "descripcion": "Mitad pata y cuerpo"},
            {"id": "RC006-P10", "numero": 10, "fila": 3, "columna": 5, "descripcion": "Cola"},
        ],
        "siguiente": [
            ("RC006-P01", "RC006-P02"), ("RC006-P02", "RC006-P03"),
            ("RC006-P03", "RC006-P04"), ("RC006-P04", "RC006-P05"),
            ("RC006-P05", "RC006-P06"), ("RC006-P06", "RC006-P07"),
            ("RC006-P07", "RC006-P08"), ("RC006-P08", "RC006-P09"),
            ("RC006-P09", "RC006-P10"),
        ],
        "conecta_con": [
            ("RC006-P01", "RC006-P04", "abajo"),
            ("RC006-P04", "RC006-P03", "izquierda"),
            ("RC006-P03", "RC006-P02", "izquierda"),
            ("RC006-P04", "RC006-P06", "derecha"),
            ("RC006-P06", "RC006-P07", "derecha"),
            ("RC006-P04", "RC006-P05", "abajo"),
            ("RC006-P05", "RC006-P08", "abajo"),
            ("RC006-P05", "RC006-P09", "derecha"),
            ("RC006-P09", "RC006-P10", "derecha"),
        ],
    },
    {
        "id": "RC007",
        "nombre": "Ciclo: Oruga, Capullo y Mariposa",
        "tematica": "Metamorfosis",
        "tipo_estructura": "mixto_numerado",
        "total_piezas": 14,
        "num_figuras": 3,
        "figuras": [
            {"id": "RC007-F1", "nombre": "Oruga",    "num_piezas": 5, "orden_narrativo": 1},
            {"id": "RC007-F2", "nombre": "Capullo",  "num_piezas": 2, "orden_narrativo": 2},
            {"id": "RC007-F3", "nombre": "Mariposa", "num_piezas": 7, "orden_narrativo": 3},
        ],
        "piezas": [
            {"id": "RC007-P01", "numero": 1,  "fila": 1, "columna": 1, "descripcion": "Tronco (parte superior)",     "figura": "RC007-F1"},
            {"id": "RC007-P02", "numero": 2,  "fila": 2, "columna": 1, "descripcion": "Tronco (parte inferior)",     "figura": "RC007-F1"},
            {"id": "RC007-P03", "numero": 3,  "fila": 2, "columna": 3, "descripcion": "Rama del tronco",             "figura": "RC007-F1"},
            {"id": "RC007-P04", "numero": 4,  "fila": 1, "columna": 2, "descripcion": "Cola de la oruga",            "figura": "RC007-F1"},
            {"id": "RC007-P05", "numero": 5,  "fila": 1, "columna": 3, "descripcion": "Cuerpo y cabeza de la oruga", "figura": "RC007-F1"},
            {"id": "RC007-P06", "numero": 6,  "fila": 3, "columna": 3, "descripcion": "Capullo (parte 1)",           "figura": "RC007-F2"},
            {"id": "RC007-P07", "numero": 7,  "fila": 4, "columna": 3, "descripcion": "Capullo (parte 2)",           "figura": "RC007-F2"},
            {"id": "RC007-P08", "numero": 8,  "fila": 2, "columna": 5, "descripcion": "Ala izquierda superior",      "figura": "RC007-F3"},
            {"id": "RC007-P09", "numero": 9,  "fila": 3, "columna": 5, "descripcion": "Ala izquierda inferior",      "figura": "RC007-F3"},
            {"id": "RC007-P10", "numero": 10, "fila": 1, "columna": 6, "descripcion": "Antena",                      "figura": "RC007-F3"},
            {"id": "RC007-P11", "numero": 11, "fila": 2, "columna": 6, "descripcion": "Cabeza",                      "figura": "RC007-F3"},
            {"id": "RC007-P12", "numero": 12, "fila": 3, "columna": 6, "descripcion": "Cuerpo",                      "figura": "RC007-F3"},
            {"id": "RC007-P13", "numero": 13, "fila": 2, "columna": 7, "descripcion": "Ala derecha superior",        "figura": "RC007-F3"},
            {"id": "RC007-P14", "numero": 14, "fila": 3, "columna": 7, "descripcion": "Ala derecha inferior",        "figura": "RC007-F3"},
        ],
        "siguiente": [
            ("RC007-P01", "RC007-P02"), ("RC007-P02", "RC007-P03"),
            ("RC007-P03", "RC007-P04"), ("RC007-P04", "RC007-P05"),
            ("RC007-P06", "RC007-P07"),
            ("RC007-P08", "RC007-P09"), ("RC007-P09", "RC007-P10"),
            ("RC007-P10", "RC007-P11"), ("RC007-P11", "RC007-P12"),
            ("RC007-P12", "RC007-P13"), ("RC007-P13", "RC007-P14"),
        ],
        "conecta_con": [
            ("RC007-P01", "RC007-P04", "derecha"),
            ("RC007-P04", "RC007-P05", "derecha"),
            ("RC007-P05", "RC007-P03", "abajo"),
            ("RC007-P03", "RC007-P06", "abajo"),
            ("RC007-P06", "RC007-P07", "abajo"),
            ("RC007-P01", "RC007-P02", "abajo"),
            ("RC007-P10", "RC007-P11", "abajo"),
            ("RC007-P11", "RC007-P12", "abajo"),
            ("RC007-P11", "RC007-P08", "izquierda"),
            ("RC007-P12", "RC007-P09", "izquierda"),
            ("RC007-P11", "RC007-P13", "derecha"),
            ("RC007-P12", "RC007-P14", "derecha"),
        ],
    },
    {
        "id": "RC008",
        "nombre": "Ciclo de vida del Pato",
        "tematica": "Ciclo de vida del pato",
        "tipo_estructura": "mixto_numerado",
        "total_piezas": 13,
        "num_figuras": 3,
        "figuras": [
            {"id": "RC008-F1", "nombre": "Huevo",       "num_piezas": 3, "orden_narrativo": 1},
            {"id": "RC008-F2", "nombre": "Patito",      "num_piezas": 4, "orden_narrativo": 2},
            {"id": "RC008-F3", "nombre": "Pato adulto", "num_piezas": 6, "orden_narrativo": 3},
        ],
        "piezas": [
            {"id": "RC008-P01", "numero": 1,  "fila": 1, "columna": 1, "descripcion": "Cáscara superior",            "figura": "RC008-F1"},
            {"id": "RC008-P02", "numero": 2,  "fila": 2, "columna": 1, "descripcion": "Polluelo (medio)",            "figura": "RC008-F1"},
            {"id": "RC008-P03", "numero": 3,  "fila": 3, "columna": 1, "descripcion": "Cáscara inferior",            "figura": "RC008-F1"},
            {"id": "RC008-P04", "numero": 4,  "fila": 1, "columna": 3, "descripcion": "Cabeza patito",               "figura": "RC008-F2"},
            {"id": "RC008-P05", "numero": 5,  "fila": 2, "columna": 3, "descripcion": "Cuerpo patito (mitad izquierda)", "figura": "RC008-F2"},
            {"id": "RC008-P06", "numero": 6,  "fila": 2, "columna": 4, "descripcion": "Cuerpo patito (mitad derecha)",   "figura": "RC008-F2"},
            {"id": "RC008-P07", "numero": 7,  "fila": 3, "columna": 3, "descripcion": "Agua (bajo el cuerpo)",        "figura": "RC008-F2"},
            {"id": "RC008-P08", "numero": 8,  "fila": 1, "columna": 6, "descripcion": "Cabeza ganso",                "figura": "RC008-F3"},
            {"id": "RC008-P09", "numero": 9,  "fila": 2, "columna": 6, "descripcion": "Cuello",                      "figura": "RC008-F3"},
            {"id": "RC008-P10", "numero": 10, "fila": 3, "columna": 6, "descripcion": "Cuerpo (mitad izquierda)",    "figura": "RC008-F3"},
            {"id": "RC008-P11", "numero": 11, "fila": 3, "columna": 7, "descripcion": "Cuerpo (mitad derecha)",      "figura": "RC008-F3"},
            {"id": "RC008-P12", "numero": 12, "fila": 4, "columna": 6, "descripcion": "Pata izquierda",              "figura": "RC008-F3"},
            {"id": "RC008-P13", "numero": 13, "fila": 4, "columna": 7, "descripcion": "Pata derecha",                "figura": "RC008-F3"},
        ],
        "siguiente": [
            ("RC008-P01", "RC008-P02"), ("RC008-P02", "RC008-P03"),
            ("RC008-P04", "RC008-P05"), ("RC008-P05", "RC008-P06"),
            ("RC008-P06", "RC008-P07"),
            ("RC008-P08", "RC008-P09"), ("RC008-P09", "RC008-P10"),
            ("RC008-P10", "RC008-P11"), ("RC008-P11", "RC008-P12"),
            ("RC008-P12", "RC008-P13"),
        ],
        "conecta_con": [
            ("RC008-P01", "RC008-P02", "abajo"),
            ("RC008-P02", "RC008-P03", "abajo"),
            ("RC008-P04", "RC008-P05", "abajo"),
            ("RC008-P05", "RC008-P06", "derecha"),
            ("RC008-P05", "RC008-P07", "abajo"),
            ("RC008-P08", "RC008-P09", "abajo"),
            ("RC008-P09", "RC008-P10", "abajo"),
            ("RC008-P10", "RC008-P11", "derecha"),
            ("RC008-P10", "RC008-P12", "abajo"),
            ("RC008-P11", "RC008-P13", "abajo"),
        ],
    },
]


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )


def build_rows() -> Dict[str, List[dict]]:
    # Devuelve filas para las 8 tablas (algunas pueden quedar vacias para un
    # rompecabezas dado; gen_csvs.py las une con las de gen_grids)
    rompecabezas: List[dict] = []
    figuras: List[dict] = []
    piezas: List[dict] = []
    pertenece_a: List[dict] = []
    parte_de: List[dict] = []
    en: List[dict] = []
    siguiente: List[dict] = []
    conecta_con: List[dict] = []

    for rc in IRREGULARES:
        rompecabezas.append({
            "serial": rc["id"],
            "nombre": rc["nombre"],
            "tematica": rc["tematica"],
            "tipo_estructura": rc["tipo_estructura"],
            "total_piezas": rc["total_piezas"],
            "num_figuras": rc["num_figuras"],
            "filas": "",
            "columnas": "",
        })

        for figura in rc["figuras"]:
            figuras.append({
                "serial": figura["id"],
                "rompecabezas_serial": rc["id"],
                "nombre": figura["nombre"],
                "num_piezas": figura["num_piezas"],
                "orden_narrativo": figura["orden_narrativo"],
            })
            en.append({"figura_serial": figura["id"], "rompecabezas_serial": rc["id"]})

        for pieza in rc["piezas"]:
            piezas.append({
                "serial": pieza["id"],
                "rompecabezas_serial": rc["id"],
                "tipo": "irregular",
                "forma": "irregular",
                "presente": "true",
                "descripcion": pieza["descripcion"],
                "fila": pieza.get("fila", ""),
                "columna": pieza.get("columna", ""),
                "numero": pieza.get("numero", ""),
                "lado_arriba": "",
                "lado_abajo": "",
                "lado_izquierda": "",
                "lado_derecha": "",
            })
            pertenece_a.append({
                "pieza_serial": pieza["id"],
                "rompecabezas_serial": rc["id"],
            })
            if "figura" in pieza:
                parte_de.append({
                    "pieza_serial": pieza["id"],
                    "figura_serial": pieza["figura"],
                })

        for src, dst in rc["siguiente"]:
            siguiente.append({"from_pieza_serial": src, "to_pieza_serial": dst})

        for src, dst, lado in rc["conecta_con"]:
            conecta_con.append({
                "from_pieza_serial": src,
                "to_pieza_serial": dst,
                "lado": lado,
            })

    return {
        "rompecabezas": rompecabezas,
        "figuras": figuras,
        "piezas": piezas,
        "pertenece_a": pertenece_a,
        "parte_de": parte_de,
        "en": en,
        "siguiente": siguiente,
        "conecta_con": conecta_con,
    }


def main() -> int:
    # Sanity check: imprime cuantas filas aporta cada tabla
    configure_logging()
    rows = build_rows()
    logger.info("Filas generadas por gen_irregulares:")
    for tabla, filas in rows.items():
        logger.info("  %s: %d", tabla, len(filas))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
