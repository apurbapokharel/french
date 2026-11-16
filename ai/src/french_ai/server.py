from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from french_ai import ALLOWED_ORIGINS, API_VERSION, SERVER_VERSION


class Health(BaseModel):
    server_version: str
    api_version: str
    engine: str | None
    model: str | None
    ready: bool


def create_app() -> FastAPI:
    """Build the API app.

    Returns:
        A FastAPI app serving the v1 API, with CORS limited to ALLOWED_ORIGINS
        and Chrome's private-network-access preflight answered.
    """
    app = FastAPI(title="French local AI server", version=API_VERSION)

    @app.get("/v1/health", operation_id="getHealth")
    def health() -> Health:
        return Health(
            server_version=SERVER_VERSION,
            api_version=API_VERSION,
            engine=None,
            model=None,
            ready=False,
        )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
        allow_private_network=True,
    )
    return app
