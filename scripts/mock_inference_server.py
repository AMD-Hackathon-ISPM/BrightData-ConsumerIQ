from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import hashlib


KEYWORDS = [
    "#reviewskincare",
    "skincare review indonesia",
    "serum skin barrier lokal",
    "serum ceramide kulit sensitif",
    "skincare jerawat redness review",
    "serum wajah non sticky indonesia",
]


INSIGHTS = {
    "gtmIntelligence": {
        "demandSignal": "Consumers are looking for calming, barrier-repair skincare with simple ingredients and marketplace-friendly proof points.",
        "positioning": "Lead with sensitive-skin safety, humidity-friendly texture, and visible redness relief.",
        "channels": ["TikTok short-form reviews", "marketplace bundles", "creator before-after content"],
    },
    "financeIntelligence": {
        "priceBand": "Keep entry bundles near the submitted price range and test multipacks for repeat purchase.",
        "marginWatch": "Monitor marketplace promo fees and creator affiliate commission before scaling discounts.",
    },
    "securityCompliance": {
        "claimsRisk": "Avoid medical acne-cure claims; use cosmetic language such as helps calm visible redness.",
        "dataRisk": "Track customer reviews without storing unnecessary personal identifiers.",
    },
}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self._send({"status": "ok"})
            return
        self._send({"status": "ok"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        body = self.rfile.read(length)
        try:
            payload = json.loads(body or b"{}")
        except json.JSONDecodeError:
            payload = {}

        if self.path == "/v1/embeddings":
            text = str(payload.get("input", ""))
            digest = hashlib.sha256(text.encode("utf-8")).digest()
            embedding = [((digest[i % len(digest)] / 255.0) * 2.0) - 1.0 for i in range(384)]
            self._send({"data": [{"embedding": embedding}], "model": "mock-embeddings"})
            return

        prompt = str(payload.get("prompt", ""))
        if "JSON array" in prompt or "targeted search keywords" in prompt:
            text = json.dumps(KEYWORDS)
        elif "Translate the following text" in prompt:
            text = prompt.split("Text:", 1)[-1].split("Translation:", 1)[0].strip()
        else:
            text = json.dumps(INSIGHTS)

        self._send({"choices": [{"text": text}]})

    def _send(self, payload):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
