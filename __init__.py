"""
ComfyUI-KikoStats: Real-time monitoring and statistics for ComfyUI
All nodes are grouped under the "ComfyAssets" category
"""

import os
import re
from pathlib import Path

try:
    from .kikostats import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS
except ImportError:
    # Handle direct import when run as a custom node
    from kikostats import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

# Tell ComfyUI where to find our JavaScript extensions
WEB_DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")


def get_version():
    """Parse version from pyproject.toml"""
    try:
        pyproject_path = Path(__file__).parent / "pyproject.toml"
        if pyproject_path.exists():
            content = pyproject_path.read_text()
            match = re.search(r'version\s*=\s*["\']([^"\']+)["\']', content)
            if match:
                return match.group(1)
    except Exception:
        pass
    return "unknown"


# Start continuous monitoring when ComfyUI loads
try:
    from .kikostats.tools.resource_monitor.logic import get_global_monitor

    # Initialize the global monitor (starts automatically)
    monitor = get_global_monitor()

    # Make monitor available globally for JavaScript access
    import sys

    if "server" in sys.modules:
        # Store reference for web access
        import server

        if hasattr(server, "PromptServer") and hasattr(server.PromptServer, "instance"):
            server.PromptServer.instance.kikostats_monitor = monitor

            # Add a simple route to expose monitor to JavaScript
            try:
                from aiohttp import web

                async def get_monitor_reference(request):
                    # This is a hack to expose Python object to JavaScript
                    return web.Response(
                        text="window.kikoStatsGlobalMonitor = "
                        + str(id(monitor))
                        + ";",
                        content_type="application/javascript",
                    )

                # Don't actually add route - just store reference for JS access
                server.PromptServer.instance.kikostats_monitor_id = id(monitor)

            except Exception as e:
                print(f"[KikoStats] Could not set up monitor access: {e}")
                pass

    # Install execution hooks for per-node tracking
    try:
        from .kikostats.execution_hooks import install_execution_hooks

        if install_execution_hooks():
            print(
                "\033[92m[KikoStats] Execution hooks installed for per-node tracking\033[0m"
            )
        else:
            print(
                "\033[93m[KikoStats] Could not install execution hooks - per-node tracking disabled\033[0m"
            )
    except Exception as e:
        print(f"\033[93m[KikoStats] Execution hooks error: {e}\033[0m")

    print(
        "\033[92m[KikoStats] Continuous monitoring initialized on ComfyUI startup\033[0m"
    )
except Exception as e:
    print(
        f"\033[93m[KikoStats] Warning: Could not start continuous monitoring: {e}\033[0m"
    )

# Print startup message with loaded tools
print()  # Empty line before
print(f"\033[94m[ComfyUI-KikoStats] Version:\033[0m {get_version()}")
for node_key, display_name in NODE_DISPLAY_NAME_MAPPINGS.items():
    print(f"🫶 \033[94mLoaded:\033[0m {display_name}")
print(f"\033[94mTotal: {len(NODE_CLASS_MAPPINGS)} monitoring tools loaded\033[0m")
print()  # Empty line after

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
