from fastapi import FastAPI, Request, HTTPException, Query, Body
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import uvicorn, random, string, json, os, time
import ollama

def generate_UID(k=16):  # for new chat
    chars = string.ascii_letters + string.digits + string.digits
    return ''.join(random.choices(chars, k=k))

app = FastAPI()
client = ollama.Client("http://rpi.netbird.cloud:11434")

client.list()

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
SETTINGS_PATH = BASE_DIR / "settings.json"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

app.mount("/static", StaticFiles(directory="static"), name="static")

chat_list = []

for chat in os.listdir(BASE_DIR / "chat_history"):
    chat_file = BASE_DIR / "chat_history" / chat
    if chat_file.is_file() and chat_file.suffix == ".json":
        with open(chat_file, "r") as f:
            loaded_json = json.load(f)
            chat_list.append({
                "chat_name": loaded_json.get("chat_name", f"New Chat"),
                "id": chat[:-5],
                "time": loaded_json.get("time", int(time.time()))
			})


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("home.html", {"request": request, "chat_list": chat_list})



@app.get("/c/{chatid}", response_class=HTMLResponse)
async def chat_view(request: Request, chatid: str):
    chat_file = BASE_DIR / "chat_history" / f"{chatid}.json"
    if not chat_file.exists():
        raise HTTPException(status_code=404, detail="Chat not found")
    with open(chat_file, "r") as f:
        chat_data = json.load(f)
        # print(f"Loaded chat data: {json.dumps(chat_data, indent=2)}")
    return templates.TemplateResponse("chat_view.html", {"request": request, "chat_data": chat_data, "chat_list": chat_list})



@app.get("/api/chat_history/{chatid}")
async def api_chat_history(chatid: str, offset: int = Query(0), limit: int = Query(20)):
    chat_file = BASE_DIR / "chat_history" / f"{chatid}.json"
    if not chat_file.exists():
        raise HTTPException(status_code=404, detail="Chat not found")
    with open(chat_file, "r") as f:
        chat_data = json.load(f)
    history = chat_data.get("history", [])
    # Reverse for latest first, then paginate
    history = history[::-1]
    paginated = history[offset:offset+limit]
    # print(f"sent: {len(paginated)}, {offset=}, {limit=}, total: {len(history)}")
    # print(json.dumps(paginated[::-1], indent=2))
    return {"messages": paginated, "total": len(history)}



@app.post("/api/chat")
async def chat_stream(request: Request):
    data = await request.json()
    message = data.get("message")
    model = data.get("model")
    print("Received message:", message)
    print("Received model:", model)

    def a():
        for chunk in client.chat(
            model="qwen:0.5b",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": message},
            ],
            stream=True
        ):
            if not chunk.done:
                yield json.dumps({"message": chunk['message']['content'], "end": chunk.done})
            else:
                yield json.dumps({
                    "end": chunk.done,
                    "total_duration": round(chunk.total_duration/1e9, 2),
                    "load_duration": round(chunk.load_duration/1e9, 2),
                    "prompt_eval_count": chunk.prompt_eval_count,
                    "prompt_eval_duration": round(chunk.prompt_eval_duration/1e9, 2),
                    "eval_count": chunk.eval_count,
                    "eval_duration": round(chunk.eval_duration/1e9, 2),
                })
    return StreamingResponse(a(), media_type="application/json")


@app.get("/settings", response_class=HTMLResponse)
async def settings(request: Request):
    return templates.TemplateResponse("settings.html", {"request": request, "chat_list": chat_list})


@app.post("/fetch")
async def fetch_model(request: Request):
    data = await request.json()
    host = data.get("host")
    url = data.get("url")
    # Only handle ollama for now
    if host != "Ollama" or not url:
        return {"status": "error", "message": "Only Ollama supported for now."}
    try:
        temp_client = ollama.Client(url)
        models = []
        for m in temp_client.list().models:
            details = temp_client.show(m.model)
            cap = details.capabilities
            models.append({
                "API": "Ollama",
                "endpoint": url,
                "model": m.model,
                "nickname": details.modelinfo.get("general.basename", m.model),
                "vision": "vision" in cap,
                "reasoning": "thinking" in cap,
                "tools": "tools" in cap
            })
        return {"status": "success", "models": models}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/models", response_class=HTMLResponse)
async def models(request: Request):
    return templates.TemplateResponse("models.html", {"request": request, "chat_list": chat_list})


@app.get("/models_settings")
async def models(request: Request):
    settings = {}
    with open(SETTINGS_PATH) as f:
        settings = json.load(f)
    return settings.get("models", {})


@app.post("/register_new_model")
async def register_new_model(request: Request):
    data = await request.json()
    nickname = data["nickname"]
    settings = {}
    with open(SETTINGS_PATH, "r") as f:
        settings = json.load(f)
    if "models" not in settings:
        settings["models"] = {}

    if nickname in settings["models"]:
        return {"status": "warning", "message": f"Model '{nickname}' already exists."}

    del data["nickname"]
    data["use"] = True
    settings["models"][nickname] = data
    with open(SETTINGS_PATH, "w") as f:
        json.dump(settings, f, indent=4)
    return {"status": "success", "message": f"Model '{nickname}' registered."}


@app.post("/update_model")
async def update_model(request: Request):
    data = await request.json()
    nickname = data["nickname"]

    settings = {}
    with open(SETTINGS_PATH, "r") as f:
        settings = json.load(f)
    if "models" not in settings:
        settings["models"] = {}

    if nickname not in settings["models"]:
        return {"status": "warning", "message": f"Model '{nickname}' does not exist. No changes made!"}

    del data["nickname"]
    data["use"] = True
    settings["models"][nickname] = data
    with open(SETTINGS_PATH, "w") as f:
        json.dump(settings, f, indent=4)
    return {"status": "success", "message": f"Model '{nickname}' updated."}


@app.post("/delete_model")
async def delete_model(request: Request):
    data = await request.json()
    # print(f"{data = }")
    nickname = data["nickname"]

    settings = {}
    with open(SETTINGS_PATH, "r") as f:
        settings = json.load(f)
    if "models" not in settings:
        settings["models"] = {}

    if nickname not in settings["models"]:
        return {"status": "error", "message": f"Model '{nickname}' does not exist."}

    del settings["models"][nickname]
    with open(SETTINGS_PATH, "w") as f:
        json.dump(settings, f, indent=4)
    return {"status": "success", "message": f"Model '{nickname}' deleted."}


