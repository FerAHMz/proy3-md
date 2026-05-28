# Ejecuta los scripts Cypher contra Neo4j AuraDB y corre verificaciones.

import logging
import os
import sys
from pathlib import Path
from typing import Tuple

from dotenv import load_dotenv
from neo4j import Driver, GraphDatabase


# Rutas relativas al directorio database/
SCRIPT_DIR = Path(__file__).resolve().parent
DATABASE_DIR = SCRIPT_DIR.parent
SCHEMA_FILE = DATABASE_DIR / "schema" / "00_schema.cypher"
RESET_FILE = DATABASE_DIR / "seeds" / "01_reset.cypher"
LOAD_CSV_FILE = DATABASE_DIR / "seeds" / "02_load_csv.cypher"

# Umbral para abortar un script si acumula demasiados errores
MAX_ERRORS_BEFORE_ABORT = 5
SEPARATOR = "=" * 70

logger = logging.getLogger("run_seed")


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )


def load_credentials() -> Tuple[str, str, str]:
    # Lee NEO4J_URI, NEO4J_USER y NEO4J_PASSWORD desde database/.env
    env_path = DATABASE_DIR / ".env"
    load_dotenv(dotenv_path=env_path)

    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME")
    password = os.getenv("NEO4J_PASSWORD")

    # Reporta todas las variables faltantes de una sola vez
    missing = [
        name
        for name, value in (
            ("NEO4J_URI", uri),
            ("NEO4J_USERNAME", user),
            ("NEO4J_PASSWORD", password),
        )
        if not value
    ]
    if missing:
        raise RuntimeError(
            "Faltan variables de entorno: "
            + ", ".join(missing)
            + f". Copia {DATABASE_DIR / '.env.example'} a "
            + f"{DATABASE_DIR / '.env'} y completa los valores reales."
        )

    return uri, user, password


def split_statements(cypher_text: str) -> list[str]:
    # Separa un script Cypher en statements individuales delimitados por ';'
    statements: list[str] = []
    current: list[str] = []
    for line in cypher_text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("//") or not stripped:
            continue
        current.append(line)
        if stripped.endswith(";"):
            stmt = "\n".join(current).strip()
            if stmt:
                statements.append(stmt.rstrip(";"))
            current = []
    if current:
        leftover = "\n".join(current).strip()
        if leftover:
            statements.append(leftover.rstrip(";"))
    return statements


def connect(uri: str, user: str, password: str) -> Driver:
    # Abre el driver y valida conectividad con una query simple
    logger.info("Conectando a %s", uri)
    driver = GraphDatabase.driver(uri, auth=(user, password))
    try:
        with driver.session() as session:
            result = session.run("RETURN 'conectado' AS msg").single()
            logger.info("Conexion OK: %s", result["msg"])
    except Exception as exc:
        driver.close()
        raise RuntimeError(f"Error de conexion a Neo4j: {exc}") from exc
    return driver


def run_script(driver: Driver, script_path: Path, label: str) -> Tuple[int, int]:
    # Ejecuta cada statement del archivo y devuelve (exitosos, errores)
    logger.info(SEPARATOR)
    logger.info("Ejecutando: %s", label)
    logger.info(SEPARATOR)

    text = script_path.read_text(encoding="utf-8")
    statements = split_statements(text)
    logger.info("Statements detectados: %d", len(statements))

    success = 0
    errors = 0
    with driver.session() as session:
        for index, stmt in enumerate(statements, start=1):
            try:
                session.run(stmt).consume()
                success += 1
            except Exception as exc:
                errors += 1
                preview = stmt[:80].replace("\n", " ")
                logger.error("Statement %d fallo: %s...", index, preview)
                logger.error("Detalle: %s", exc)
                # Aborta el script si supera el umbral para no inundar la salida
                if errors > MAX_ERRORS_BEFORE_ABORT:
                    logger.error(
                        "Mas de %d errores, abortando script", MAX_ERRORS_BEFORE_ABORT
                    )
                    return success, errors

    logger.info("Resultado: %d exitosos, %d errores", success, errors)
    return success, errors


def verify_seed(driver: Driver) -> None:
    # Corre las verificaciones post-seed: totales, conexiones, lados y BFS
    logger.info(SEPARATOR)
    logger.info("VERIFICACION POST-SEED")
    logger.info(SEPARATOR)

    with driver.session() as session:
        total = session.run("MATCH (p:Pieza) RETURN count(p) AS total").single()
        logger.info("Total de piezas: %d", total["total"])

        logger.info("Resumen por rompecabezas:")
        rows = session.run(
            """
            MATCH (r:Rompecabezas)
            OPTIONAL MATCH (p:Pieza)-[:PERTENECE_A]->(r)
            OPTIONAL MATCH (f:Figura)-[:EN]->(r)
            WITH r, count(DISTINCT p) AS piezas, count(DISTINCT f) AS figuras
            RETURN r.serial AS serial, r.nombre AS nombre, r.tipo_estructura AS tipo,
                   r.total_piezas AS esperadas, piezas AS reales, figuras AS figs
            ORDER BY r.serial
            """
        )
        for row in rows:
            estado = "OK" if row["esperadas"] == row["reales"] else "MISMATCH"
            logger.info(
                "  [%s] %s %-22s piezas: %2d/%2d figuras: %d - %s",
                estado,
                row["serial"],
                row["tipo"],
                row["reales"],
                row["esperadas"],
                row["figs"],
                row["nombre"],
            )

        logger.info("Conexiones CONECTA_CON por rompecabezas:")
        rows = session.run(
            """
            MATCH (a:Pieza)-[c:CONECTA_CON]->(b:Pieza)
            WHERE a.rompecabezas_serial = b.rompecabezas_serial
            RETURN a.rompecabezas_serial AS rc, count(*) AS conexiones
            ORDER BY rc
            """
        )
        for row in rows:
            logger.info("  %s: %d conexiones", row["rc"], row["conexiones"])

        # Lados horizontales: si A.lado_derecha=saliente, el vecino debe tener
        # lado_izquierda=abertura (y viceversa)
        horiz = session.run(
            """
            MATCH (a:Pieza)-[c:CONECTA_CON {lado: 'derecha'}]->(b:Pieza)
            WHERE a.lado_derecha IS NOT NULL
              AND NOT (
                (a.lado_derecha = 'saliente' AND b.lado_izquierda = 'abertura') OR
                (a.lado_derecha = 'abertura' AND b.lado_izquierda = 'saliente')
              )
            RETURN count(*) AS inconsistentes
            """
        ).single()
        if horiz["inconsistentes"] == 0:
            logger.info("Lados horizontales: todos consistentes")
        else:
            logger.error("Lados horizontales inconsistentes: %d", horiz["inconsistentes"])

        # Misma regla para el eje vertical
        vert = session.run(
            """
            MATCH (a:Pieza)-[c:CONECTA_CON {lado: 'abajo'}]->(b:Pieza)
            WHERE a.lado_abajo IS NOT NULL
              AND NOT (
                (a.lado_abajo = 'saliente' AND b.lado_arriba = 'abertura') OR
                (a.lado_abajo = 'abertura' AND b.lado_arriba = 'saliente')
              )
            RETURN count(*) AS inconsistentes
            """
        ).single()
        if vert["inconsistentes"] == 0:
            logger.info("Lados verticales: todos consistentes")
        else:
            logger.error("Lados verticales inconsistentes: %d", vert["inconsistentes"])

        bfs = session.run(
            """
            MATCH (inicio:Pieza {serial: 'RC001-P02-03'})
            MATCH path = (inicio)-[:CONECTA_CON*0..]-(siguiente:Pieza)
            WHERE ALL(p IN nodes(path) WHERE p.presente = true)
            WITH siguiente, min(length(path)) AS paso
            RETURN count(siguiente) AS alcanzables
            """
        ).single()
        logger.info(
            "BFS desde RC001-P02-03: %d piezas alcanzables (esperado 24)",
            bfs["alcanzables"],
        )


def main() -> int:
    configure_logging()

    try:
        uri, user, password = load_credentials()
    except RuntimeError as exc:
        logger.error("%s", exc)
        return 1

    try:
        driver = connect(uri, user, password)
    except RuntimeError as exc:
        logger.error("%s", exc)
        return 1

    # close() en finally asegura cerrar la conexion ante cualquier salida
    try:
        run_script(driver, SCHEMA_FILE, "00_schema (constraints e indices)")
        run_script(driver, RESET_FILE, "01_reset (limpiar grafo)")

        _, errors = run_script(
            driver, LOAD_CSV_FILE, "02_load_csv (LOAD CSV desde GitHub raw)"
        )
        if errors > 0:
            logger.error("Abortando por errores en LOAD CSV")
            return 1

        verify_seed(driver)
    finally:
        driver.close()

    logger.info(SEPARATOR)
    logger.info("LISTO. La base Neo4j esta poblada y verificada.")
    logger.info(SEPARATOR)
    return 0


if __name__ == "__main__":
    sys.exit(main())
