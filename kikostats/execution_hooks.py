"""
ComfyUI Execution Hooks for Node-Level Resource Monitoring
Integrates with ComfyUI's execution system to track per-node performance
"""

import time
from typing import Dict, Any, Optional

# Global state for tracking
_node_tracking_data = {}
_current_node_info = {}

def get_node_info_from_prompt(prompt_id: str, node_id: str) -> Dict[str, str]:
    """Extract node information from the current execution context"""
    # In a real implementation, this would extract from ComfyUI's execution context
    # For now, return basic info
    return {
        'node_type': _current_node_info.get(node_id, {}).get('type', 'Unknown'),
        'node_title': _current_node_info.get(node_id, {}).get('title', f'Node {node_id}')
    }

def on_node_execution_start(prompt_id: str, node_id: str, node_data: Dict[str, Any]):
    """Called when a node starts executing"""
    try:
        from .tools.resource_monitor.logic import get_global_monitor
        
        # Store node info for later use
        _current_node_info[node_id] = {
            'type': node_data.get('class_type', 'Unknown'),
            'title': node_data.get('_meta', {}).get('title', f'Node {node_id}')
        }
        
        # Get node information
        node_info = get_node_info_from_prompt(prompt_id, node_id)
        
        # Start tracking this node
        monitor = get_global_monitor()
        monitor.start_node_tracking(
            node_id=node_id,
            node_type=node_info['node_type'],
            node_title=node_info['node_title']
        )
        
        print(f"[KikoStats] Started tracking execution: {node_info['node_title']} ({node_info['node_type']}) [{node_id}]")
        
    except Exception as e:
        print(f"[KikoStats] Error starting node tracking: {e}")

def on_node_execution_end(prompt_id: str, node_id: str, output_data: Any):
    """Called when a node finishes executing"""
    try:
        from .tools.resource_monitor.logic import get_global_monitor
        
        # Stop tracking this node
        monitor = get_global_monitor()
        metrics = monitor.stop_node_tracking(node_id)
        
        if metrics:
            print(f"[KikoStats] Completed tracking: {metrics['node_title']} "
                  f"({metrics['duration_ms']:.1f}ms, "
                  f"CPU: {metrics['avg_cpu_percent']:.1f}%, "
                  f"GPU: {metrics['avg_gpu_utilization']:.1f}%)")
        
        # Clean up node info
        _current_node_info.pop(node_id, None)
        
    except Exception as e:
        print(f"[KikoStats] Error stopping node tracking: {e}")

def install_execution_hooks():
    """Install execution hooks into ComfyUI's execution system"""
    try:
        # Try to hook into ComfyUI's execution system
        import execution
        import server
        
        # Store original methods
        if hasattr(execution, 'PromptExecutor'):
            original_execute = execution.PromptExecutor.execute
            
            def wrapped_execute(self, prompt, prompt_id, extra_data={}, execute_outputs=[]):
                """Wrapped execute method that tracks nodes"""
                
                # Store original methods for node execution
                if hasattr(self, 'execute_node'):
                    original_execute_node = self.execute_node
                    
                    def wrapped_execute_node(node, current_item, prompt_id, dynprompt):
                        """Wrapped node execution"""
                        node_id = str(current_item)
                        
                        # Get node data
                        node_data = prompt.get(node_id, {})
                        
                        # Start tracking
                        on_node_execution_start(prompt_id, node_id, node_data)
                        
                        try:
                            # Execute the node
                            result = original_execute_node(node, current_item, prompt_id, dynprompt)
                            return result
                        finally:
                            # Stop tracking
                            on_node_execution_end(prompt_id, node_id, None)
                    
                    # Replace the method temporarily
                    self.execute_node = wrapped_execute_node
                
                # Call original execute
                return original_execute(self, prompt, prompt_id, extra_data, execute_outputs)
            
            # Replace the method
            execution.PromptExecutor.execute = wrapped_execute
            
            print("[KikoStats] Successfully installed execution hooks")
            return True
            
    except Exception as e:
        print(f"[KikoStats] Could not install execution hooks: {e}")
        return False
    
    return False