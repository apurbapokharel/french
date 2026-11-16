import argparse
import os

import uvicorn

from french_ai import DEFAULT_HOST, DEFAULT_PORT
from french_ai.server import create_app


def main(argv: list[str] | None = None) -> None:
    """Run the french-ai command line.

    Args:
        argv: arguments without the program name; defaults to sys.argv.
    """
    parser = argparse.ArgumentParser(prog="french-ai")
    commands = parser.add_subparsers(dest="command", required=True)
    serve = commands.add_parser("serve", help="start the local API server")
    serve.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("FRENCH_AI_PORT", DEFAULT_PORT)),
        help=f"port to listen on (default {DEFAULT_PORT}, or FRENCH_AI_PORT)",
    )
    args = parser.parse_args(argv)

    if args.command == "serve":
        uvicorn.run(create_app(), host=DEFAULT_HOST, port=args.port)
