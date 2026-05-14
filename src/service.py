import os

from requests import Session
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
from youtube_transcript_api.proxies import WebshareProxyConfig

from .utils import extract_video_id


class YouTubeTranscriptService:
    """Wraps youtube-transcript-api with optional Webshare proxy support."""

    def __init__(self, use_proxy: bool = True):
        self.api = self._create_api(use_proxy)

    def _create_api(self, use_proxy: bool) -> YouTubeTranscriptApi:
        if not use_proxy:
            return YouTubeTranscriptApi()

        username = os.getenv("WEBSHARE_USERNAME")
        password = os.getenv("WEBSHARE_PASSWORD")

        if username and password:
            proxy_config = WebshareProxyConfig(
                proxy_username=username,
                proxy_password=password,
            )
            session = Session()
            session.proxies = proxy_config.to_requests_dict()
            return YouTubeTranscriptApi(http_client=session)

        return YouTubeTranscriptApi()

    def fetch(self, video_url_or_id: str):
        video_id = extract_video_id(video_url_or_id)
        return self.api.fetch(video_id)

    def get_transcript_text(self, video_url_or_id: str) -> str:
        transcript = self.fetch(video_url_or_id)
        return TextFormatter().format_transcript(transcript)
