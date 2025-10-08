"""
Resource Monitor ComfyUI Node
Provides ComfyUI interface for real-time GPU and system monitoring
"""

import json
import time
from typing import Dict, Any, Tuple

from ...base import ComfyAssetsBaseNode
from .logic import ResourceMonitor, validate_update_interval, format_memory_size, format_percentage, get_global_monitor


class ResourceMonitorNode(ComfyAssetsBaseNode):
    """
    ComfyUI node for real-time resource monitoring
    
    Displays GPU utilization, VRAM usage, CPU usage, and RAM usage
    with real-time updates at 1-second intervals.
    
    Inputs:
        - display_mode (STRING): Output format ("text", "json", "both")
        - enable_gpu (BOOLEAN): Enable GPU monitoring
        - enable_system (BOOLEAN): Enable system monitoring
    
    Outputs:
        - stats (STRING): Formatted statistics output
        - json_data (STRING): JSON statistics for chaining
    """
    
    # Class variable to maintain monitor instance across executions
    _monitor_instance: ResourceMonitor = None
    
    @classmethod
    def INPUT_TYPES(cls) -> Dict[str, Any]:
        """
        Define ComfyUI input interface
        
        Returns:
            Dict with required and optional input specifications
        """
        return {
            "required": {
                "display_mode": (
                    ["text", "json", "both"],
                    {
                        "default": "text",
                        "tooltip": "Output format for monitoring data"
                    },
                ),
            },
            "optional": {
                "enable_gpu": (
                    "BOOLEAN",
                    {
                        "default": True,
                        "tooltip": "Enable GPU monitoring (requires NVIDIA GPU and drivers)"
                    },
                ),
                "enable_system": (
                    "BOOLEAN",
                    {
                        "default": True,
                        "tooltip": "Enable system resource monitoring (CPU, RAM)"
                    },
                ),
            },
        }
    
    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("stats", "json_data")
    FUNCTION = "monitor_resources"
    
    def monitor_resources(
        self,
        display_mode: str,
        enable_gpu: bool = True,
        enable_system: bool = True,
    ) -> Tuple[str, str]:
        """
        Monitor system and GPU resources with real-time updates
        
        Args:
            display_mode: Output format ("text", "json", "both")
            enable_gpu: Whether to monitor GPU resources
            enable_system: Whether to monitor system resources
            
        Returns:
            Tuple of (formatted_stats, json_data)
            
        Raises:
            ValueError: If validation fails
        """
        try:
            # Validate inputs
            self.validate_inputs(
                display_mode=display_mode,
                enable_gpu=enable_gpu,
                enable_system=enable_system
            )
            
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
            
            # Filter based on enabled monitoring
            if not enable_gpu:
                stats_dict["gpu"]["available"] = False
            if not enable_system:
                stats_dict["system"]["available"] = False
            
            # Format output based on display mode
            if display_mode == "text":
                formatted_stats = self._format_text_output(stats_dict, enable_gpu, enable_system)
                json_data = ""
            elif display_mode == "json":
                formatted_stats = ""
                json_data = json.dumps(stats_dict, indent=2)
            else:  # "both"
                formatted_stats = self._format_text_output(stats_dict, enable_gpu, enable_system)
                json_data = json.dumps(stats_dict, indent=2)
            
            # Log monitoring status
            self.log_info(
                f"Continuous Monitoring Active: GPU={enable_gpu}, System={enable_system}, "
                f"Display={display_mode} (Real-time updates via WebSocket)"
            )
            
            return formatted_stats, json_data
            
        except Exception as e:
            error_msg = f"Failed to monitor resources: {str(e)}"
            self.handle_error(error_msg, e)
    
    
    def _format_text_output(
        self, 
        stats_dict: Dict[str, Any], 
        enable_gpu: bool, 
        enable_system: bool
    ) -> str:
        """
        Format statistics as human-readable text
        
        Args:
            stats_dict: Statistics dictionary
            enable_gpu: Whether GPU monitoring is enabled
            enable_system: Whether system monitoring is enabled
            
        Returns:
            Formatted text string
        """
        lines = []
        lines.append("=== ComfyUI Resource Monitor ===")
        
        # GPU Statistics
        if enable_gpu:
            gpu = stats_dict["gpu"]
            if gpu["available"]:
                lines.append("\n🖥️  GPU Statistics:")
                lines.append(f"   Utilization: {gpu['utilization']}%")
                lines.append(f"   VRAM: {format_memory_size(gpu['memory_used'])} / "
                           f"{format_memory_size(gpu['memory_total'])} "
                           f"({format_percentage(gpu['memory_percent'])})")
                lines.append(f"   Temperature: {gpu['temperature']}°C")
                lines.append(f"   Power: {gpu['power_draw']}W")
            else:
                lines.append("\n🖥️  GPU: Not Available")
                lines.append("   (Requires NVIDIA GPU and drivers)")
        
        # System Statistics
        if enable_system:
            system = stats_dict["system"]
            if system["available"]:
                lines.append("\n💻 System Statistics:")
                lines.append(f"   CPU Usage: {format_percentage(system['cpu_percent'])}")
                lines.append(f"   RAM: {format_memory_size(system['ram_used'])} / "
                           f"{format_memory_size(system['ram_total'])} "
                           f"({format_percentage(system['ram_percent'])})")
            else:
                lines.append("\n💻 System: Not Available")
                lines.append("   (Requires psutil library)")
        
        # Add timestamp
        import time
        timestamp = time.strftime("%H:%M:%S", time.localtime(stats_dict["timestamp"]))
        lines.append(f"\n⏰ Last Updated: {timestamp}")
        
        return "\n".join(lines)
    
    def validate_inputs(
        self,
        display_mode: str,
        enable_gpu: bool,
        enable_system: bool,
    ) -> None:
        """
        Validate inputs specific to resource monitor
        
        Args:
            display_mode: Display mode to validate
            enable_gpu: GPU monitoring flag
            enable_system: System monitoring flag
            
        Raises:
            ValueError: If validation fails
        """
        # Validate display mode
        valid_modes = ["text", "json", "both"]
        if display_mode not in valid_modes:
            raise ValueError(f"Invalid display_mode '{display_mode}'. Must be one of: {valid_modes}")
        
        # Validate boolean flags
        for flag_name, flag_value in [("enable_gpu", enable_gpu), ("enable_system", enable_system)]:
            if not isinstance(flag_value, bool):
                raise ValueError(f"{flag_name} must be a boolean, got {type(flag_value).__name__}")
        
        # Check that at least one monitoring type is enabled
        if not enable_gpu and not enable_system:
            raise ValueError("At least one monitoring type (GPU or System) must be enabled")


# Node class mappings for ComfyUI registration
NODE_CLASS_MAPPINGS = {
    "ResourceMonitor": ResourceMonitorNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ResourceMonitor": "Resource Monitor",
}