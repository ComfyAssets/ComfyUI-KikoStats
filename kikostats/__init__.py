"""
KikoStats package initialization and node registry
Handles automatic discovery and registration of all ComfyAssets monitoring tools
"""

from .tools.resource_monitor import ResourceMonitorNode

# ComfyUI node registration mappings
NODE_CLASS_MAPPINGS = {
    "ResourceMonitor": ResourceMonitorNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ResourceMonitor": "Resource Monitor",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]