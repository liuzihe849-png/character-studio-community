#!/bin/zsh
cd "$(dirname "$0")"
if [[ -x .venv/bin/python ]]; then exec .venv/bin/python start.py; else exec python3 setup.py --start; fi
