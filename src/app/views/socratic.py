"""Socratic API proxy view.

Proxies requests to OpenRouter and enforces a Socratic-only system prompt.
"""
from __future__ import annotations

import os
from flask import Blueprint, jsonify, request
import httpx

socratic_bp = Blueprint('socratic', __name__)


@socratic_bp.route('/api/socratic', methods=['POST'])
def socratic_api():  # type: ignore[no-untyped-def]
    """Proxy endpoint that forwards conversation + code to OpenRouter.

    Expected JSON body: { code: str, language?: str, history?: [{role, text}] }
    Returns: { reply: str }
    """
    data = request.get_json() or {}
    code = data.get('code', '')
    language = data.get('language', 'text')
    history = data.get('history', [])

    api_key = os.environ.get('OPENROUTER_API_KEY')
    if not api_key:
        return jsonify({'error': 'OpenRouter API key not configured'}), 500

    # Strong system prompt enforcing Socratic behavior (Wayfinder)
    system_prompt = (
        "You are Wayfinder, a Socratic coaching assistant for CS106B students "
        "learning C++ and Python. You ONLY respond with guiding questions "
        "— never give direct answers, solutions, or code."

        "\n\nWhen coaching, operate at multiple levels:\n\n"
        "- **Conceptual:** Help students build mental models of abstract "
        "concepts like recursion, pointers, memory, stacks, trees, and Big-O. "
        "Ask questions like 'What do you think happens to the stack each "
        "time this function calls itself?'\n"
        "- **Design:** Guide students to think about decomposition, choice "
        "of data structure, and algorithm strategy before writing code.\n"
        "- **Debugging:** Ask about invariants, edge cases, and expected "
        "vs. actual behavior — not line-by-line fixes.\n\n"
        "When a student is stuck, first normalize struggle ('This is a hard "
        "part — let's think through it together.') then ask ONE focused "
        "question. Never ask multiple questions at once.\n\n"
        "If a student seems frustrated or lost, ask what they've already "
        "tried and whether they've visited office hours or talked to a peer. "
        "Help them recognize when to seek human help — that's a skill too.\n\n"
        "Keep responses short. One question at a time, always."
    )

    # Build messages for chat completion
    messages = [
        {"role": "system", "content": system_prompt},
    ]

    # Provide the code context as a user message
    code_msg = (
        f"Here is a code snippet (language={language}):\n\n{code}\n\n"
        "Please only ask Socratic questions to help the student reason about "
        "this code."
    )
    messages.append({"role": "user", "content": code_msg})

    # Append any prior conversation (client may include short history)
    for entry in history:
        role = entry.get('role', 'user')
        text = entry.get('text', '')
        if role not in ('user', 'assistant'):
            role = 'user'
        messages.append({"role": role, "content": text})

    # Call OpenRouter chat completions endpoint
    url = os.environ.get('OPENROUTER_URL', 'https://openrouter.ai/api/v1/chat/completions')
    model = os.environ.get('OPENROUTER_MODEL', 'meta-llama/llama-3.3-8b-instruct:free')

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 400,
        "temperature": 0.7,
    }

    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            body = resp.json()

            # OpenRouter response format: look for choices[0].message.content
            choices = body.get('choices') or []
            if choices and isinstance(choices, list):
                first = choices[0]
                message = first.get('message') or first.get('delta') or {}
                text = message.get('content') or message.get('message') or ''
            else:
                text = ''

            # Fallback: some providers include content in .choices[0].text
            if not text:
                text = (choices[0].get('text') if choices else '') or ''

            return jsonify({'reply': text})
    except httpx.HTTPError as exc:
        return jsonify({'error': 'Upstream request failed', 'details': str(exc)}), 502
