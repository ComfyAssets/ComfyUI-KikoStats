"""
Resource Monitor ComfyUI Node
Provides ComfyUI interface for real-time GPU and system monitoring
"""

import json
import time
from typing import Dict, Any, Tuple

from ...base import ComfyAssetsBaseNode
from .logic import get_global_monitor


class ResourceMonitorNode(ComfyAssetsBaseNode):
    """
    ComfyUI node for real-time resource monitoring
    
    Displays GPU utilization, VRAM usage, CPU usage, RAM usage, and temperature
    with real-time updates at 1-second intervals via WebSocket.
    
    Provides a visual interface with live charts and per-node performance tracking.
    
    Outputs:
        - stats (STRING): Empty string (all display handled by UI widget)
        - json_data (STRING): JSON statistics for chaining with other nodes
    """
    
    @classmethod
    def INPUT_TYPES(cls) -> Dict[str, Any]:
        """
        Define ComfyUI input interface
        
        Returns:
            Dict with required and optional input specifications
        """
        return {
            "required": {},
            "optional": {},
        }
    
    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("stats", "json_data")
    FUNCTION = "monitor_resources"
    
    def monitor_resources(
        self,
    ) -> Tuple[str, str]:
        """
        Monitor system and GPU resources with real-time updates
        
        Returns:
            Tuple of (formatted_stats, json_data)
        """
        try:
            # Get the global continuous monitor (starts automatically)
            continuous_monitor = get_global_monitor()
            
            # Get latest stats from continuous monitoring
            stats_dict = continuous_monitor.get_latest_stats()
            
            # If no stats yet, return waiting message
            if stats_dict is None:
                waiting_stats = {
                    "timestamp": time.time(),
                    "gpu": {"available": False, "utilization": 0, "memory_used": 0, "memory_total": 0, "memory_percent": 0.0, "temperature": 0, "power_draw": 0},
                    "system": {"available": False, "cpu_percent": 0.0, "ram_used": 0, "ram_total": 0, "ram_percent": 0.0}
                }
                stats_dict = waiting_stats
            
            # Return JSON data for the UI widget
            json_data = json.dumps(stats_dict, indent=2)
            
            # Return empty string for stats (UI displays everything)
            return "", json_data
            
        except Exception as e:
            error_msg = f"Failed to monitor resources: {str(e)}"
            self.handle_error(error_msg, e)
    
    
    


# Node class mappings for ComfyUI registration
NODE_CLASS_MAPPINGS = {
    "ResourceMonitor": ResourceMonitorNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ResourceMonitor": "Resource Monitor",
}