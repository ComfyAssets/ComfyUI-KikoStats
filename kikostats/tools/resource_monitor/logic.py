"""
Core monitoring logic for Resource Monitor
Handles GPU and system resource data collection
"""

import time
import threading
import asyncio
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from collections import defaultdict

# Try to import monitoring libraries with graceful fallbacks
try:
    import pynvml
    PYNVML_AVAILABLE = True
except ImportError:
    PYNVML_AVAILABLE = False
    pynvml = None

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    psutil = None

# Try to import ComfyUI server for WebSocket communication
try:
    from server import PromptServer
    COMFYUI_SERVER_AVAILABLE = True
except ImportError:
    COMFYUI_SERVER_AVAILABLE = False
    PromptServer = None


@dataclass
class GPUStats:
    """GPU monitoring statistics"""
    utilization: int  # GPU utilization percentage (0-100)
    memory_used: int  # VRAM used in MB
    memory_total: int  # Total VRAM in MB
    memory_percent: float  # VRAM usage percentage
    temperature: int  # GPU temperature in Celsius
    power_draw: int  # Power consumption in Watts
    available: bool = True  # Whether GPU monitoring is available


@dataclass
class SystemStats:
    """System resource statistics"""
    cpu_percent: float  # CPU usage percentage
    ram_used: int  # RAM used in MB
    ram_total: int  # Total RAM in MB
    ram_percent: float  # RAM usage percentage
    available: bool = True  # Whether system monitoring is available


@dataclass
class NodeResourceSample:
    """Single resource measurement for a node"""
    timestamp: float
    cpu_percent: float
    gpu_utilization: int
    gpu_memory_used: int
    vram_delta: int  # Change in VRAM usage since last sample


@dataclass
class NodeResourceMetrics:
    """Aggregated resource metrics for a node"""
    node_id: str
    node_type: str = ""
    node_title: str = ""
    start_time: float = 0.0
    end_time: float = 0.0
    duration_ms: float = 0.0
    
    # CPU metrics
    avg_cpu_percent: float = 0.0
    max_cpu_percent: float = 0.0
    
    # GPU metrics  
    avg_gpu_utilization: float = 0.0
    max_gpu_utilization: float = 0.0
    peak_vram_used: int = 0
    vram_delta: int = 0  # Net VRAM change during execution
    
    # Sample data
    samples: list = field(default_factory=list)
    
    def calculate_aggregates(self):
        """Calculate aggregate metrics from samples"""
        if not self.samples:
            return
            
        self.duration_ms = (self.end_time - self.start_time) * 1000
        
        cpu_values = [s.cpu_percent for s in self.samples]
        gpu_values = [s.gpu_utilization for s in self.samples]
        vram_values = [s.gpu_memory_used for s in self.samples]
        
        self.avg_cpu_percent = sum(cpu_values) / len(cpu_values) if cpu_values else 0
        self.max_cpu_percent = max(cpu_values) if cpu_values else 0
        
        self.avg_gpu_utilization = sum(gpu_values) / len(gpu_values) if gpu_values else 0
        self.max_gpu_utilization = max(gpu_values) if gpu_values else 0
        
        self.peak_vram_used = max(vram_values) if vram_values else 0
        
        # Calculate net VRAM change
        if len(self.samples) >= 2:
            self.vram_delta = self.samples[-1].gpu_memory_used - self.samples[0].gpu_memory_used


def initialize_gpu_monitoring() -> bool:
    """
    Initialize GPU monitoring using NVIDIA Management Library
    
    Returns:
        bool: True if GPU monitoring is available, False otherwise
    """
    if not PYNVML_AVAILABLE:
        return False
    
    try:
        pynvml.nvmlInit()
        # Try to get device count to verify NVIDIA drivers are working
        device_count = pynvml.nvmlDeviceGetCount()
        return device_count > 0
    except Exception:
        return False


def get_gpu_stats(device_index: int = 0) -> GPUStats:
    """
    Get current GPU statistics using NVIDIA Management Library
    
    Args:
        device_index: GPU device index (default: 0 for primary GPU)
        
    Returns:
        GPUStats object with current GPU metrics
    """
    if not PYNVML_AVAILABLE:
        return GPUStats(
            utilization=0,
            memory_used=0,
            memory_total=0,
            memory_percent=0.0,
            temperature=0,
            power_draw=0,
            available=False
        )
    
    try:
        # Ensure pynvml is initialized
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(device_index)
        
        # Get GPU utilization
        try:
            util = pynvml.nvmlDeviceGetUtilizationRates(handle)
            gpu_util = util.gpu
        except Exception:
            gpu_util = 0
        
        # Get memory info
        try:
            mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            memory_used = mem_info.used // (1024 * 1024)  # Convert to MB
            memory_total = mem_info.total // (1024 * 1024)  # Convert to MB
            memory_percent = (mem_info.used / mem_info.total) * 100
        except Exception:
            memory_used = memory_total = 0
            memory_percent = 0.0
        
        # Get temperature
        try:
            temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
        except Exception:
            temp = 0
        
        # Get power draw
        try:
            power = pynvml.nvmlDeviceGetPowerUsage(handle) // 1000  # Convert to Watts
        except Exception:
            power = 0
        
        return GPUStats(
            utilization=gpu_util,
            memory_used=memory_used,
            memory_total=memory_total,
            memory_percent=memory_percent,
            temperature=temp,
            power_draw=power,
            available=True
        )
        
    except Exception as e:
        # GPU monitoring failed - return unavailable stats
        return GPUStats(
            utilization=0,
            memory_used=0,
            memory_total=0,
            memory_percent=0.0,
            temperature=0,
            power_draw=0,
            available=False
        )


def get_system_stats() -> SystemStats:
    """
    Get current system resource statistics using psutil
    
    Returns:
        SystemStats object with current system metrics
    """
    if not PSUTIL_AVAILABLE:
        return SystemStats(
            cpu_percent=0.0,
            ram_used=0,
            ram_total=0,
            ram_percent=0.0,
            available=False
        )
    
    try:
        # Get CPU usage (non-blocking, based on last call)
        cpu_percent = psutil.cpu_percent(interval=0)
        
        # Get memory info
        memory = psutil.virtual_memory()
        ram_used = memory.used // (1024 * 1024)  # Convert to MB
        ram_total = memory.total // (1024 * 1024)  # Convert to MB
        ram_percent = memory.percent
        
        return SystemStats(
            cpu_percent=cpu_percent,
            ram_used=ram_used,
            ram_total=ram_total,
            ram_percent=ram_percent,
            available=True
        )
        
    except Exception:
        return SystemStats(
            cpu_percent=0.0,
            ram_used=0,
            ram_total=0,
            ram_percent=0.0,
            available=False
        )


class ResourceMonitor:
    """
    Thread-safe resource monitoring class
    Collects GPU and system statistics in separate thread
    """
    
    def __init__(self, update_interval: float = 1.0):
        """
        Initialize resource monitor
        
        Args:
            update_interval: Monitoring update interval in seconds
        """
        self.update_interval = update_interval
        self.monitoring = False
        self.monitor_thread: Optional[threading.Thread] = None
        self.lock = threading.Lock()
        
        # Latest stats
        self.gpu_stats: Optional[GPUStats] = None
        self.system_stats: Optional[SystemStats] = None
        
        # Initialize monitoring capabilities
        self.gpu_available = initialize_gpu_monitoring()
        self.system_available = PSUTIL_AVAILABLE
    
    def start_monitoring(self) -> None:
        """Start monitoring in background thread"""
        if self.monitoring:
            return
        
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
    
    def stop_monitoring(self) -> None:
        """Stop background monitoring"""
        self.monitoring = False
        if self.monitor_thread and self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=2.0)
    
    def _monitor_loop(self) -> None:
        """Main monitoring loop running in background thread"""
        while self.monitoring:
            try:
                # Collect stats
                gpu_stats = get_gpu_stats() if self.gpu_available else None
                system_stats = get_system_stats() if self.system_available else None
                
                # Thread-safe update
                with self.lock:
                    self.gpu_stats = gpu_stats
                    self.system_stats = system_stats
                
                # Sleep until next update
                time.sleep(self.update_interval)
                
            except Exception:
                # Continue monitoring even if individual collection fails
                time.sleep(self.update_interval)
    
    def get_current_stats(self) -> Tuple[Optional[GPUStats], Optional[SystemStats]]:
        """
        Get latest monitoring statistics
        
        Returns:
            Tuple of (gpu_stats, system_stats) or (None, None) if not available
        """
        with self.lock:
            return self.gpu_stats, self.system_stats
    
    def get_stats_dict(self) -> Dict[str, Any]:
        """
        Get statistics as dictionary for JSON serialization
        
        Returns:
            Dictionary containing all current statistics
        """
        gpu_stats, system_stats = self.get_current_stats()
        
        result = {
            "timestamp": time.time(),
            "gpu": {
                "available": gpu_stats.available if gpu_stats else False,
                "utilization": gpu_stats.utilization if gpu_stats else 0,
                "memory_used": gpu_stats.memory_used if gpu_stats else 0,
                "memory_total": gpu_stats.memory_total if gpu_stats else 0,
                "memory_percent": gpu_stats.memory_percent if gpu_stats else 0.0,
                "temperature": gpu_stats.temperature if gpu_stats else 0,
                "power_draw": gpu_stats.power_draw if gpu_stats else 0,
            },
            "system": {
                "available": system_stats.available if system_stats else False,
                "cpu_percent": system_stats.cpu_percent if system_stats else 0.0,
                "ram_used": system_stats.ram_used if system_stats else 0,
                "ram_total": system_stats.ram_total if system_stats else 0,
                "ram_percent": system_stats.ram_percent if system_stats else 0.0,
            }
        }
        
        return result


def validate_update_interval(interval: float) -> None:
    """
    Validate monitoring update interval
    
    Args:
        interval: Update interval in seconds
        
    Raises:
        ValueError: If interval is out of valid range
    """
    if not isinstance(interval, (int, float)):
        raise ValueError(f"Update interval must be a number, got {type(interval).__name__}")
    
    if interval < 0.1:
        raise ValueError(f"Update interval too small: {interval}s (minimum: 0.1s)")
    
    if interval > 60.0:
        raise ValueError(f"Update interval too large: {interval}s (maximum: 60s)")


def format_memory_size(size_mb: int) -> str:
    """
    Format memory size for display
    
    Args:
        size_mb: Memory size in megabytes
        
    Returns:
        Formatted string (e.g., "4.2 GB", "512 MB")
    """
    if size_mb >= 1024:
        return f"{size_mb / 1024:.1f} GB"
    else:
        return f"{size_mb} MB"


def format_percentage(percent: float) -> str:
    """
    Format percentage for display
    
    Args:
        percent: Percentage value
        
    Returns:
        Formatted percentage string
    """
    return f"{percent:.1f}%"


class NodeResourceTracker:
    """
    Tracks resource usage per ComfyUI node during execution
    """
    
    def __init__(self):
        self.current_node_id: Optional[str] = None
        self.active_nodes: Dict[str, NodeResourceMetrics] = {}
        self.completed_nodes: Dict[str, NodeResourceMetrics] = {}
        self.lock = threading.Lock()
        
        # For tracking resource baselines
        self.baseline_stats = None
    
    def start_node_tracking(self, node_id: str, node_type: str = "", node_title: str = ""):
        """Start tracking resources for a specific node"""
        with self.lock:
            self.current_node_id = node_id
            
            # Create metrics object for this node
            metrics = NodeResourceMetrics(
                node_id=node_id,
                node_type=node_type,
                node_title=node_title,
                start_time=time.time()
            )
            
            self.active_nodes[node_id] = metrics
            
            # Store baseline for calculating deltas
            self.baseline_stats = self._get_current_stats()
            
            print(f"[KikoStats] Started tracking node: {node_id} ({node_type})")
    
    def stop_node_tracking(self, node_id: str):
        """Stop tracking and finalize metrics for a node"""
        with self.lock:
            if node_id in self.active_nodes:
                metrics = self.active_nodes[node_id]
                metrics.end_time = time.time()
                
                # Calculate aggregate metrics
                metrics.calculate_aggregates()
                
                # Move to completed
                self.completed_nodes[node_id] = metrics
                del self.active_nodes[node_id]
                
                # Clear current tracking
                if self.current_node_id == node_id:
                    self.current_node_id = None
                
                print(f"[KikoStats] Completed tracking node: {node_id} "
                      f"(Duration: {metrics.duration_ms:.1f}ms, "
                      f"Avg CPU: {metrics.avg_cpu_percent:.1f}%, "
                      f"Avg GPU: {metrics.avg_gpu_utilization:.1f}%)")
                
                return metrics
        
        return None
    
    def sample_current_node(self, gpu_stats: Optional[GPUStats], system_stats: Optional[SystemStats]):
        """Sample resources for the currently tracking node"""
        with self.lock:
            if not self.current_node_id or self.current_node_id not in self.active_nodes:
                return
            
            # Create sample
            sample = NodeResourceSample(
                timestamp=time.time(),
                cpu_percent=system_stats.cpu_percent if system_stats else 0.0,
                gpu_utilization=gpu_stats.utilization if gpu_stats else 0,
                gpu_memory_used=gpu_stats.memory_used if gpu_stats else 0,
                vram_delta=0  # Will be calculated later
            )
            
            # Add to current node's samples
            self.active_nodes[self.current_node_id].samples.append(sample)
    
    def get_recent_node_metrics(self, limit: int = 10) -> list:
        """Get recent completed node metrics"""
        with self.lock:
            # Get most recent completed nodes
            recent = list(self.completed_nodes.values())[-limit:]
            
            # Convert to dictionaries for JSON serialization
            return [
                {
                    'node_id': m.node_id,
                    'node_type': m.node_type,
                    'node_title': m.node_title,
                    'duration_ms': m.duration_ms,
                    'avg_cpu_percent': m.avg_cpu_percent,
                    'max_cpu_percent': m.max_cpu_percent,
                    'avg_gpu_utilization': m.avg_gpu_utilization,
                    'max_gpu_utilization': m.max_gpu_utilization,
                    'peak_vram_used': m.peak_vram_used,
                    'vram_delta': m.vram_delta,
                    'sample_count': len(m.samples)
                }
                for m in recent
            ]
    
    def clear_old_metrics(self, keep_count: int = 50):
        """Clear old completed metrics to prevent memory buildup"""
        with self.lock:
            if len(self.completed_nodes) > keep_count:
                # Keep only the most recent entries
                sorted_items = sorted(self.completed_nodes.items(), 
                                    key=lambda x: x[1].end_time)
                to_keep = dict(sorted_items[-keep_count:])
                self.completed_nodes = to_keep
    
    def _get_current_stats(self) -> Dict[str, Any]:
        """Get current system stats for baseline calculations"""
        gpu_stats = get_gpu_stats()
        system_stats = get_system_stats()
        
        return {
            'cpu_percent': system_stats.cpu_percent if system_stats else 0.0,
            'gpu_utilization': gpu_stats.utilization if gpu_stats else 0,
            'gpu_memory_used': gpu_stats.memory_used if gpu_stats else 0
        }


class ContinuousResourceMonitor:
    """
    Continuous background monitoring similar to Crystools
    Sends real-time data via ComfyUI WebSocket
    """
    
    def __init__(self, update_interval: float = 1.0):
        """
        Initialize continuous monitor
        
        Args:
            update_interval: Update frequency in seconds
        """
        self.update_interval = update_interval
        self.running = False
        self.thread = None
        self.lock = threading.Lock()
        
        # Latest stats cache
        self.latest_stats = None
        
        # Node tracking
        self.node_tracker = NodeResourceTracker()
        
        # Initialize monitoring capabilities
        self.gpu_available = initialize_gpu_monitoring()
        self.system_available = PSUTIL_AVAILABLE
        
        # Initialize CPU monitoring baseline
        if self.system_available:
            try:
                # Prime CPU monitoring with first call
                psutil.cpu_percent(interval=None)
            except Exception:
                pass
    
    def start_monitoring(self):
        """Start continuous background monitoring"""
        if self.running:
            return
            
        self.running = True
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()
        print(f"[KikoStats] Started continuous monitoring (interval: {self.update_interval}s)")
    
    def stop_monitoring(self):
        """Stop background monitoring"""
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2.0)
        print("[KikoStats] Stopped continuous monitoring")
    
    def _monitor_loop(self):
        """Main monitoring loop - runs continuously in background"""
        while self.running:
            try:
                # Collect fresh stats
                gpu_stats = get_gpu_stats() if self.gpu_available else None
                system_stats = get_system_stats() if self.system_available else None
                
                # Sample current node if tracking
                self.node_tracker.sample_current_node(gpu_stats, system_stats)
                
                # Create stats dictionary
                stats_dict = {
                    "timestamp": time.time(),
                    "gpu": {
                        "available": gpu_stats.available if gpu_stats else False,
                        "utilization": gpu_stats.utilization if gpu_stats else 0,
                        "memory_used": gpu_stats.memory_used if gpu_stats else 0,
                        "memory_total": gpu_stats.memory_total if gpu_stats else 0,
                        "memory_percent": gpu_stats.memory_percent if gpu_stats else 0.0,
                        "temperature": gpu_stats.temperature if gpu_stats else 0,
                        "power_draw": gpu_stats.power_draw if gpu_stats else 0,
                    },
                    "system": {
                        "available": system_stats.available if system_stats else False,
                        "cpu_percent": system_stats.cpu_percent if system_stats else 0.0,
                        "ram_used": system_stats.ram_used if system_stats else 0,
                        "ram_total": system_stats.ram_total if system_stats else 0,
                        "ram_percent": system_stats.ram_percent if system_stats else 0.0,
                    },
                    "nodes": self.node_tracker.get_recent_node_metrics(limit=10)
                }
                
                # Thread-safe update
                with self.lock:
                    self.latest_stats = stats_dict
                
                # Check for node tracking commands from JavaScript
                self._process_js_tracking_commands()
                
                # Send real-time data via WebSocket (like Crystools)
                if COMFYUI_SERVER_AVAILABLE and PromptServer.instance:
                    try:
                        PromptServer.instance.send_sync('kikostats.monitor', stats_dict)
                    except Exception as e:
                        # Don't let WebSocket errors stop monitoring
                        pass
                
                # Sleep until next update
                time.sleep(self.update_interval)
                
            except Exception as e:
                # Continue monitoring even if individual collection fails
                print(f"[KikoStats] Monitoring error: {e}")
                time.sleep(self.update_interval)
    
    def get_latest_stats(self) -> Optional[Dict[str, Any]]:
        """Get the latest cached stats"""
        with self.lock:
            return self.latest_stats.copy() if self.latest_stats else None
    
    def start_node_tracking(self, node_id: str, node_type: str = "", node_title: str = ""):
        """Start tracking resources for a specific node"""
        self.node_tracker.start_node_tracking(node_id, node_type, node_title)
        
        # Send node start event via WebSocket
        if COMFYUI_SERVER_AVAILABLE and PromptServer.instance:
            try:
                PromptServer.instance.send_sync('kikostats.node_start', {
                    'node_id': node_id,
                    'node_type': node_type,
                    'node_title': node_title,
                    'timestamp': time.time()
                })
            except Exception:
                pass
    
    def stop_node_tracking(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Stop tracking and get final metrics for a node"""
        metrics = self.node_tracker.stop_node_tracking(node_id)
        
        if metrics:
            # Convert to dict for WebSocket
            metrics_dict = {
                'node_id': metrics.node_id,
                'node_type': metrics.node_type,
                'node_title': metrics.node_title,
                'duration_ms': metrics.duration_ms,
                'avg_cpu_percent': metrics.avg_cpu_percent,
                'max_cpu_percent': metrics.max_cpu_percent,
                'avg_gpu_utilization': metrics.avg_gpu_utilization,
                'max_gpu_utilization': metrics.max_gpu_utilization,
                'peak_vram_used': metrics.peak_vram_used,
                'vram_delta': metrics.vram_delta,
                'sample_count': len(metrics.samples)
            }
            
            # Send node completion event via WebSocket
            if COMFYUI_SERVER_AVAILABLE and PromptServer.instance:
                try:
                    PromptServer.instance.send_sync('kikostats.node_complete', metrics_dict)
                except Exception:
                    pass
            
            return metrics_dict
        
        return None
    
    def send_workflow_complete(self, total_execution_time: float):
        """Send workflow completion event with total execution time"""
        if COMFYUI_SERVER_AVAILABLE and PromptServer.instance:
            try:
                PromptServer.instance.send_sync('kikostats.workflow_complete', {
                    'total_execution_time': total_execution_time,
                    'timestamp': time.time()
                })
                print(f"[KikoStats] Workflow completed in {total_execution_time:.2f}s")
            except Exception as e:
                print(f"[KikoStats] Error sending workflow complete event: {e}")
    
    def _process_js_tracking_commands(self):
        """Process node tracking commands from JavaScript frontend"""
        # This is a simple approach - in a real implementation you'd use proper IPC
        # For now, we'll implement a basic execution hook approach
        pass


# Global continuous monitor instance
_global_monitor: Optional[ContinuousResourceMonitor] = None


def get_global_monitor() -> ContinuousResourceMonitor:
    """Get or create the global continuous monitor"""
    global _global_monitor
    if _global_monitor is None:
        _global_monitor = ContinuousResourceMonitor(update_interval=1.0)
        _global_monitor.start_monitoring()
    return _global_monitor


def stop_global_monitor():
    """Stop the global monitor (for cleanup)"""
    global _global_monitor
    if _global_monitor:
        _global_monitor.stop_monitoring()
        _global_monitor = None