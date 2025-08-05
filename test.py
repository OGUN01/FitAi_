import httpx

response = httpx.post(
    "http://localhost:8082/v1/messages",
    json={
        "model": "Paid/ver-miror-sr/anthropic/claude-4-sonnet",  # Maps to MIDDLE_MODEL
        "max_tokens": 100,
        "messages": [
            {"role": "user", "content": "Hello!"}
        ]
    }
)