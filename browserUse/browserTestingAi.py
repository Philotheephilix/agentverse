import os
import json
import httpx
import logging

from typing import Optional
from dotenv import load_dotenv
from pydantic import BaseModel

from browser_use import ActionResult, Agent, Browser, BrowserConfig, Controller
from browser_use.browser.context import BrowserContext, BrowserContextConfig, BrowserSession
from browser_use.browser.views import BrowserState
from browser_use.agent.views import AgentOutput
from playwright.async_api import async_playwright, Page, BrowserContext as PlaywrightContext
from langchain_openai import ChatOpenAI

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

load_dotenv()
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

controller = Controller()

@controller.registry.action("Enable Logging")
async def enable_logging(browser: BrowserContext):
    page = await browser.get_current_page()
    page.on("console", lambda msg: print(msg.text))
    page.on("request", lambda request: print(">>", request.method, request.url))
    page.on("response", lambda response: print("<<", response.status, response.url))
    msg = f"🛠️  Enabled logging"
    return ActionResult(extracted_content=msg, include_in_memory=True)

class ExtendedBrowserSession(BrowserSession):
    """Extended version of BrowserSession that includes current_page"""
    def __init__(
        self,
        context: PlaywrightContext,
        cached_state: Optional[dict] = None,
        current_page: Optional[Page] = None
    ):
        super().__init__(context=context, cached_state=cached_state)
        self.current_page = current_page

class UseBrowserContext(BrowserContext):
    def __init__(self, browser: Browser, config: BrowserContextConfig, session_id: str):
        super().__init__(browser, config)
        self.session_id = session_id

    async def _initialize_session(self) -> ExtendedBrowserSession:
        """Initialize a browser session."""
        playwright_browser = await self.browser.get_playwright_browser()
        context = await self._create_context(playwright_browser)
        wallet_relayer_url = "http://localhost:3000/session"
        await context.add_init_script(f'window.relayer = "{wallet_relayer_url}";')
        await context.add_init_script(f'window.session = "{self.session_id}";')

        self._add_new_page_listener(context)

        self.session = ExtendedBrowserSession(
            context=context,
            cached_state=None,
        )
        self.session.current_page = context.pages[0] if context.pages else await context.new_page()
        
        self.session.cached_state = await self._update_state()
        
        return self.session

async def setup_anchor_browser(session_id: str, anchor_session_id: str) -> tuple[Browser, UseBrowserContext]:
    logging.info(f"Connecting to external browser via CDP URL...")
    anchor_api_key = "sk-c1edd4e784a55dd509c967ac57d85ba7"
    try:
         browser = Browser(config=BrowserConfig(        
            cdp_url=f"wss://connect.anchorbrowser.io?apiKey={anchor_api_key}&sessionId={anchor_session_id}"
        ))
    except Exception as e:   
        logging.error(f"Failed to connect to Anchor browser: {e}")
        raise e
        
    logging.info(f"Connecting to Anchor browser session: {anchor_session_id}")
        
    context = UseBrowserContext(
        browser,
        BrowserContextConfig(
            wait_for_network_idle_page_load_time=10.0,
            highlight_elements=True,
        ),
        session_id
    )

    return browser, context  

def create_step_callback(session_id: str):
    async def new_step_callback(state: BrowserState, model_output: AgentOutput, steps: int):
        log_entry = to_serializable(model_output)
        logging.info(f"Logging step {model_output} for session {session_id}: {log_entry}")
        wallet_relayer_url = "http://localhost:3000/session"
        async with httpx.AsyncClient() as client:
            logging.info(f"Logging step {steps} for session {session_id}: {log_entry}")
            await client.post(
                f"{wallet_relayer_url}/{session_id}/log",
                json=log_entry,
            )
    return new_step_callback

async def setup_agent(browser: Browser, context: UseBrowserContext, task: str, session_id: str) -> Agent:
    logging.info(f"Setting up agent with task: {task}")
    return Agent(
        task=task,
        llm=ChatOpenAI(model="gpt-4o"),
        browser=browser,
        browser_context=context,
        use_vision=True, 
        controller=controller,
        register_new_step_callback=create_step_callback(session_id),
    )

class ChatRequest(BaseModel):
    text: str

class ChatResponse(BaseModel):
    text: str

class TestModulesRequest(BaseModel):
    site_url: str
    modules: list
    session_id: Optional[str] = "default"
    anchor_session_id: Optional[str] = "default_anchor"

class TestModulesResponse(BaseModel):
    modules: list

def to_serializable(obj):
    if isinstance(obj, (str, int, float, bool)) or obj is None:
        return obj
    elif isinstance(obj, list):
        return [to_serializable(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: to_serializable(value) for key, value in obj.items()}
    elif hasattr(obj, '__dict__'):
        return {key: to_serializable(value) for key, value in vars(obj).items()}
    else:
        return str(obj)  


@app.post("/test-modules", response_model=TestModulesResponse)
async def test_modules(request: TestModulesRequest):

    browser = None
    context = None
    try:
        session_id = request.session_id
        anchor_session_id = request.anchor_session_id
        browser, context = await setup_anchor_browser(session_id, anchor_session_id)
        logging.info(f"Connected to Anchor browser session: {anchor_session_id}")
        
        # Navigate to the provided site URL
        session = await context._initialize_session()
        current_page = session.current_page
        await current_page.goto(request.site_url)
        logging.info(f"Navigated to site: {request.site_url}")
        
        updated_modules = []
        for module in request.modules:
            updated_submodules = []
            for sub in module.get("submodules", []):
                # A more compelling and clear prompt for testing the feature
                test_prompt = (
                    f"Please thoroughly evaluate the functionality of the feature '{sub.get('title')}' "
                    f"on the website '{request.site_url}'. The feature is described as: '{sub.get('description')}'. "
                    "Interact with the page and perform all necessary steps to confirm that this feature is working as expected. "
                    "Once you have completed your evaluation, return a concise JSON response in the exact format: "
                    "{'approved': true} if the feature functions correctly, or {'approved': false} if it does not."
                )
                agent = await setup_agent(browser, context, test_prompt, session_id)
                try:
                    result = await agent.run(max_steps=10)
                    output = result.model_outputs()
                    # Convert the agent output to a serializable structure
                    output = to_serializable(output)
                    
                    # Try to extract "approved" if output is a dict
                    approved = None
                    if isinstance(output, dict):
                        approved = output.get("approved")
                    
                    # If not available, handle list or string outputs heuristically
                    if approved is None:
                        if isinstance(output, list):
                            # Join list elements into a string
                            combined = " ".join(str(item) for item in output)
                        elif isinstance(output, str):
                            combined = output
                        else:
                            combined = str(output)
                        # A simple heuristic: if the output text mentions 'success' or 'working correctly', mark as approved
                        if "success" in combined.lower() or "working correctly" in combined.lower():
                            approved = True
                        else:
                            approved = False
                except Exception as e:
                    logging.error(f"Error testing submodule {sub.get('title')}: {e}")
                    approved = False

                sub_updated = sub.copy()
                sub_updated["approved"] = approved
                updated_submodules.append(sub_updated)
            module_updated = module.copy()
            module_updated["submodules"] = updated_submodules
            updated_modules.append(module_updated)
        
        # Ensure browser session is properly closed before returning
        logging.info(f"Testing complete. Closing browser session: {anchor_session_id}")
        await context.close()
        await browser.close()
        logging.info(f"Browser session closed successfully: {anchor_session_id}")
        
        return TestModulesResponse(modules=updated_modules)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Ensure browser and context are closed even if an exception occurs
        if context:
            try:
                await context.close()
                logging.info("Browser context closed in finally block")
            except Exception as close_error:
                logging.error(f"Error closing browser context: {close_error}")
        
        if browser:
            try:
                await browser.close()
                logging.info("Browser closed in finally block")
            except Exception as close_error:
                logging.error(f"Error closing browser: {close_error}")




if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
