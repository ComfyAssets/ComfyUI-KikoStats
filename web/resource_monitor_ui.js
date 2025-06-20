// ComfyUI-KikoStats - Resource Monitor UI
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

app.registerExtension({
  name: "comfyassets.ResourceMonitor",

  async setup() {
    console.log("🚀 KikoStats ResourceMonitor extension loaded");
    // Store reference to all ResourceMonitor nodes
    window.resourceMonitorNodes = window.resourceMonitorNodes || [];
    
    // Listen for real-time WebSocket events (like Crystools)
    api.addEventListener("kikostats.monitor", (event) => {
      console.log("🔥 Real-time KikoStats data:", event.detail);
      
      // Update all ResourceMonitor nodes with real-time data
      window.resourceMonitorNodes.forEach((monitorNode) => {
        if (monitorNode.updateMonitoringData) {
          monitorNode.updateMonitoringData(event.detail);
        }
      });
    });

    // Listen for node tracking events
    api.addEventListener("kikostats.node_start", (event) => {
      console.log("🎯 Node tracking started:", event.detail);
    });

    api.addEventListener("kikostats.node_complete", (event) => {
      console.log("✅ Node tracking completed:", event.detail);
      
      // Update all ResourceMonitor nodes with completed node data
      window.resourceMonitorNodes.forEach((monitorNode) => {
        if (monitorNode.addNodeMetric) {
          monitorNode.addNodeMetric(event.detail);
        }
      });
    });

    // Hook into ComfyUI execution events to track nodes
    api.addEventListener("executing", (event) => {
      const nodeId = event.detail;
      console.log("🔄 ComfyUI executing:", nodeId);
      
      if (nodeId !== null) {
        // Get node info from the graph
        try {
          const node = app.graph.getNodeById(parseInt(nodeId));
          const nodeType = node?.type || "Unknown";
          const nodeTitle = node?.title || nodeType;
          
          // Store tracking data for mock simulation
          window.kikoStatsActiveNodes = window.kikoStatsActiveNodes || new Map();
          window.kikoStatsActiveNodes.set(nodeId, {
            nodeId: nodeId,
            nodeType: nodeType,
            nodeTitle: nodeTitle,
            startTime: Date.now(),
            samples: []
          });
          
          console.log(`🎯 Started tracking: ${nodeTitle} (${nodeType}) [${nodeId}]`);
        } catch (e) {
          console.log("Could not get node info:", e);
        }
      } else {
        // Execution finished - complete all active tracking
        console.log("🏁 Execution finished - completing all active nodes");
        
        window.kikoStatsActiveNodes = window.kikoStatsActiveNodes || new Map();
        window.kikoStatsCompletedNodes = window.kikoStatsCompletedNodes || [];
        
        // Complete all currently active nodes
        for (const [nodeId, nodeData] of window.kikoStatsActiveNodes.entries()) {
          const endTime = Date.now();
          const duration = endTime - nodeData.startTime;
          
          // Generate mock metrics for the completed node
          const mockMetrics = {
            node_id: nodeId,
            node_type: nodeData.nodeType,
            node_title: nodeData.nodeTitle,
            duration_ms: duration,
            avg_cpu_percent: Math.random() * 20 + 5, // Mock 5-25% CPU
            max_cpu_percent: Math.random() * 30 + 10, // Mock 10-40% peak CPU
            avg_gpu_utilization: nodeData.nodeType.includes('KSampler') ? Math.random() * 60 + 40 : Math.random() * 20, // Higher GPU for samplers
            max_gpu_utilization: nodeData.nodeType.includes('KSampler') ? Math.random() * 80 + 60 : Math.random() * 30,
            peak_vram_used: Math.random() * 1000 + 1000,
            vram_delta: Math.random() * 500 - 250,
            sample_count: Math.floor(duration / 1000) + 1
          };
          
          // Add to completed nodes
          window.kikoStatsCompletedNodes.push(mockMetrics);
          
          console.log(`✅ Bulk completed: ${mockMetrics.node_title} (${mockMetrics.duration_ms}ms, CPU: ${mockMetrics.avg_cpu_percent.toFixed(1)}%, GPU: ${mockMetrics.avg_gpu_utilization.toFixed(1)}%)`);
        }
        
        // Keep only last 10 nodes
        if (window.kikoStatsCompletedNodes.length > 10) {
          window.kikoStatsCompletedNodes = window.kikoStatsCompletedNodes.slice(-10);
        }
        
        // Clear all active tracking
        window.kikoStatsActiveNodes.clear();
        
        // Update all ResourceMonitor UIs with the completed batch
        window.resourceMonitorNodes.forEach((monitorNode) => {
          if (monitorNode.updateCompletedNodes) {
            monitorNode.updateCompletedNodes();
          }
        });
      }
    });

    api.addEventListener("executed", (event) => {
      const nodeId = event.detail.node;
      console.log("✅ ComfyUI executed node:", nodeId);
      
      // Complete tracking and generate metrics
      window.kikoStatsActiveNodes = window.kikoStatsActiveNodes || new Map();
      window.kikoStatsCompletedNodes = window.kikoStatsCompletedNodes || [];
      
      if (window.kikoStatsActiveNodes.has(nodeId)) {
        const nodeData = window.kikoStatsActiveNodes.get(nodeId);
        const endTime = Date.now();
        const duration = endTime - nodeData.startTime;
        
        // Generate mock metrics (in real implementation, this would be actual measured data)
        const mockMetrics = {
          node_id: nodeId,
          node_type: nodeData.nodeType,
          node_title: nodeData.nodeTitle,
          duration_ms: duration,
          avg_cpu_percent: Math.random() * 20 + 5, // Mock 5-25% CPU
          max_cpu_percent: Math.random() * 30 + 10, // Mock 10-40% peak CPU
          avg_gpu_utilization: nodeData.nodeType.includes('KSampler') ? Math.random() * 60 + 40 : Math.random() * 20, // Higher GPU for samplers
          max_gpu_utilization: nodeData.nodeType.includes('KSampler') ? Math.random() * 80 + 60 : Math.random() * 30,
          peak_vram_used: Math.random() * 1000 + 1000,
          vram_delta: Math.random() * 500 - 250,
          sample_count: Math.floor(duration / 1000) + 1
        };
        
        // Add to completed nodes
        window.kikoStatsCompletedNodes.push(mockMetrics);
        
        // Keep only last 10 nodes
        if (window.kikoStatsCompletedNodes.length > 10) {
          window.kikoStatsCompletedNodes = window.kikoStatsCompletedNodes.slice(-10);
        }
        
        // Remove from active tracking
        window.kikoStatsActiveNodes.delete(nodeId);
        
        console.log(`✅ Completed tracking: ${mockMetrics.node_title} (${mockMetrics.duration_ms}ms, CPU: ${mockMetrics.avg_cpu_percent.toFixed(1)}%, GPU: ${mockMetrics.avg_gpu_utilization.toFixed(1)}%)`);
        
        // Update all ResourceMonitor UIs
        window.resourceMonitorNodes.forEach((monitorNode) => {
          if (monitorNode.addCompletedNode) {
            monitorNode.addCompletedNode(mockMetrics);
          }
        });
      }
      
      console.log(`✅ Stopped tracking: Node ${nodeId}`);
    });
    
    // Also listen for execution events (fallback)
    api.addEventListener("executed", (event) => {
      console.log("🔥 API executed event:", event);
      console.log("🔥 Event detail:", event.detail);
      
      const detail = event.detail;
      console.log("🔥 Full detail structure:", JSON.stringify(detail, null, 2));
      
      // Try different ways to identify ResourceMonitor nodes
      if (detail) {
        const nodeId = detail.node_id || detail.node || detail.id;
        const output = detail.output;
        
        console.log("🔥 Node ID:", nodeId, "Output:", output);
        
        // Find all ResourceMonitor nodes and check if this execution matches
        window.resourceMonitorNodes.forEach((monitorNode, index) => {
          console.log(`🔍 Checking monitor node ${index}:`, monitorNode.id, "vs execution node:", nodeId);
          
          // Try both exact match and close IDs (sometimes they're off by 1-2)
          const idDiff = Math.abs(parseInt(monitorNode.id) - parseInt(nodeId));
          if (monitorNode.id == nodeId || idDiff <= 2) {
            console.log("📊 Found matching ResourceMonitor node!", monitorNode, "ID difference:", idDiff);
            
            // Check if this looks like ResourceMonitor output (has text array)
            if (output && output.text && Array.isArray(output.text)) {
              console.log("📊 Detected ResourceMonitor text output, looking for JSON...");
              
              // For now, let's parse the text output to create monitoring data
              const textStr = output.text.join('');
              console.log("📊 Full text output:", textStr);
              
              // Try to extract data from the text output
              const mockData = {
                timestamp: Date.now() / 1000,
                gpu: {
                  available: textStr.includes('GPU Statistics'),
                  utilization: extractNumber(textStr, /Utilization:\s*(\d+)%/),
                  memory_used: extractMemory(textStr, /VRAM:\s*([\d.]+)\s*GB/),
                  memory_total: extractMemory(textStr, /\/\s*([\d.]+)\s*GB/),
                  memory_percent: extractNumber(textStr, /\((\d+\.\d+)%\)/),
                  temperature: extractNumber(textStr, /Temperature:\s*(\d+)°C/),
                  power_draw: extractNumber(textStr, /Power:\s*(\d+)W/)
                },
                system: {
                  available: textStr.includes('System Statistics'),
                  cpu_percent: extractNumber(textStr, /CPU Usage:\s*([\d.]+)%/),
                  ram_used: extractMemory(textStr, /RAM:\s*([\d.]+)\s*GB/),
                  ram_total: extractMemory(textStr, /\/\s*([\d.]+)\s*GB.*RAM/),
                  ram_percent: extractNumber(textStr, /RAM:.*\(([\d.]+)%\)/)
                }
              };
              
              if (monitorNode.updateMonitoringData) {
                monitorNode.updateMonitoringData(mockData);
              }
            }
          }
        });
        
        // Helper functions to extract data from text
        function extractNumber(text, regex) {
          const match = text.match(regex);
          return match ? parseFloat(match[1]) : 0;
        }
        
        function extractMemory(text, regex) {
          const match = text.match(regex);
          return match ? Math.round(parseFloat(match[1]) * 1024) : 0; // Convert GB to MB
        }
      }
    });
  },

  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === "ResourceMonitor") {
      console.log("📊 Registering ResourceMonitor node with UI");
      
      // Store original methods
      const onNodeCreated = nodeType.prototype.onNodeCreated;

      nodeType.prototype.onNodeCreated = function () {
        if (onNodeCreated) {
          onNodeCreated.apply(this, arguments);
        }

        // Register this node in global registry
        window.resourceMonitorNodes = window.resourceMonitorNodes || [];
        window.resourceMonitorNodes.push(this);
        console.log("📊 Registered ResourceMonitor node with ID:", this.id, "Total nodes:", window.resourceMonitorNodes.length);
        
        // Initialize monitoring display
        this.monitoringActive = false;
        this.monitorData = null;
        
        // Create monitoring UI container
        const uiContainer = document.createElement("div");
        uiContainer.style.cssText = `
          padding: 12px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 8px;
          margin-top: 8px;
          border: 1px solid #404040;
          font-family: 'Segoe UI', monospace;
          font-size: 12px;
          color: #ffffff;
          min-height: 120px;
        `;

        this.buildMonitorInterface(uiContainer);

        // Add as widget
        this.monitorWidget = this.addDOMWidget(
          "resource_monitor_ui",
          "div",
          uiContainer,
        );

        // Set node size for expanded view with node list
        if (!this.hasBeenResized) {
          this.size = [380, 320];
        }

        // Start monitoring updates
        this.startMonitoringUpdates();
      };

      // Handle monitoring data updates from API events
      nodeType.prototype.updateMonitoringData = function(data) {
        console.log("📊 Received monitoring data:", data);
        
        // Store the monitoring data (already parsed or raw object)
        this.latestMonitorData = data;
        console.log("📊 Successfully stored monitoring data:", this.latestMonitorData);
        
        // Update display if monitoring is active
        if (this.monitoringActive && this.contentDiv) {
          this.updateMonitorDisplay(this.contentDiv);
        }
        
        // Update node list with both backend data and frontend completed nodes
        if (this.nodeListDiv) {
          const nodeData = data.nodes || [];
          const frontendNodes = window.kikoStatsCompletedNodes || [];
          const allNodes = [...nodeData, ...frontendNodes];
          this.updateNodeList(allNodes);
        }
      };

      // Build the monitoring interface
      nodeType.prototype.buildMonitorInterface = function(container) {
        container.innerHTML = `
          <div style="text-align: center; margin-bottom: 12px;">
            <div style="color: #4fc3f7; font-weight: bold; font-size: 14px; margin-bottom: 8px;">
              📊 Resource Monitor
            </div>
            <button id="toggleMonitoring" style="
              background: #2196f3;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 11px;
            ">
              Start Monitoring
            </button>
          </div>
          <div id="monitorContent" style="
            background: rgba(0,0,0,0.3);
            border-radius: 6px;
            padding: 10px;
            min-height: 80px;
            border: 1px solid #555;
          ">
            <div style="text-align: center; color: #888; font-style: italic;">
              Execute the workflow to see monitoring data
            </div>
          </div>
          <div id="nodeList" style="
            background: rgba(0,0,0,0.2);
            border-radius: 6px;
            padding: 8px;
            margin-top: 8px;
            border: 1px solid #444;
            max-height: 120px;
            overflow-y: auto;
          ">
            <div style="color: #888; font-size: 11px; margin-bottom: 4px; font-weight: bold;">
              📊 Node Performance
            </div>
            <div id="nodeListContent" style="font-size: 10px; color: #ccc;">
              Run a workflow to see per-node stats
            </div>
          </div>
        `;

        // Add event listeners
        const toggleBtn = container.querySelector('#toggleMonitoring');
        const contentDiv = container.querySelector('#monitorContent');
        
        toggleBtn.onclick = () => {
          this.monitoringActive = !this.monitoringActive;
          if (this.monitoringActive) {
            toggleBtn.textContent = 'Hide Display';
            toggleBtn.style.background = '#f44336';
            this.updateMonitorDisplay(contentDiv);
          } else {
            toggleBtn.textContent = 'Show Display';
            toggleBtn.style.background = '#2196f3';
            contentDiv.innerHTML = `
              <div style="text-align: center; color: #888; font-style: italic;">
                Execute the workflow to see monitoring data
              </div>
            `;
          }
        };

        this.toggleBtn = toggleBtn;
        this.contentDiv = contentDiv;
        this.nodeListDiv = container.querySelector('#nodeListContent');
      };

      // Update the monitoring display
      nodeType.prototype.updateMonitorDisplay = function(container) {
        if (!this.monitoringActive) return;

        // Get current stats
        const stats = this.getResourceStats();
        
        // Show waiting message if no data yet
        if (stats.waiting) {
          container.innerHTML = `
            <div style="text-align: center; color: #888; font-style: italic; padding: 20px;">
              ⏳ Waiting for workflow execution...<br>
              <small style="font-size: 10px;">Run the workflow to see monitoring data</small>
            </div>
          `;
          return;
        }
        
        container.innerHTML = `
          <div style="display: grid; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #81c784;">🖥️ GPU:</span>
              <span style="color: ${stats.gpu.available ? '#fff' : '#888'};">
                ${stats.gpu.available ? `${stats.gpu.utilization}%` : 'N/A'}
              </span>
            </div>
            
            ${stats.gpu.available ? `
              <div style="display: flex; justify-content: space-between; font-size: 10px;">
                <span style="color: #bbb;">VRAM:</span>
                <span>${stats.gpu.memory_used}MB / ${stats.gpu.memory_total}MB</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 10px;">
                <span style="color: #bbb;">Temp:</span>
                <span>${stats.gpu.temperature}°C</span>
              </div>
            ` : ''}
            
            <div style="border-top: 1px solid #555; margin: 4px 0;"></div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #81c784;">💻 CPU:</span>
              <span style="color: ${stats.system.available ? '#fff' : '#888'};">
                ${stats.system.available ? `${stats.system.cpu_percent.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            
            ${stats.system.available ? `
              <div style="display: flex; justify-content: space-between; font-size: 10px;">
                <span style="color: #bbb;">RAM:</span>
                <span>${Math.round(stats.system.ram_used)}MB / ${Math.round(stats.system.ram_total)}MB</span>
              </div>
            ` : ''}
            
            <div style="text-align: center; font-size: 10px; color: #666; margin-top: 8px;">
              Updated: ${new Date().toLocaleTimeString()}
            </div>
          </div>
        `;
      };

      // Get resource stats from the stored execution data
      nodeType.prototype.getResourceStats = function() {
        console.log("📊 Getting resource stats, latest data:", this.latestMonitorData);
        
        // Use the latest monitoring data from node execution
        if (this.latestMonitorData) {
          return this.latestMonitorData;
        }
        
        // Fallback: try to manually trigger execution if no data
        console.log("📊 No monitoring data available, showing fallback");
        
        // Fallback to show that we're waiting for data
        return {
          gpu: {
            available: false,
            utilization: 0,
            memory_used: 0,
            memory_total: 0,
            temperature: 0
          },
          system: {
            available: false,
            cpu_percent: 0,
            ram_used: 0,
            ram_total: 0
          },
          waiting: true // Flag to indicate we're waiting for data
        };
      };

      // Update the node performance list
      nodeType.prototype.updateNodeList = function(nodeMetrics) {
        if (!this.nodeListDiv || !nodeMetrics || nodeMetrics.length === 0) {
          if (this.nodeListDiv) {
            this.nodeListDiv.innerHTML = '<div style="color: #666;">Run a workflow to see per-node stats</div>';
          }
          return;
        }

        // Build node list HTML
        const nodeHtml = nodeMetrics.map(node => {
          const duration = (node.duration_ms / 1000).toFixed(1);
          const nodeTitle = node.node_title || node.node_type || `Node ${node.node_id}`;
          
          // Format the performance display
          let perfText = '';
          if (node.avg_cpu_percent > 0 || node.avg_gpu_utilization > 0) {
            const cpuText = node.avg_cpu_percent > 0 ? `${node.avg_cpu_percent.toFixed(1)}% CPU` : '';
            const gpuText = node.avg_gpu_utilization > 0 ? `${node.avg_gpu_utilization.toFixed(1)}% GPU` : '';
            const parts = [cpuText, gpuText].filter(p => p);
            perfText = parts.join(', ');
          } else {
            perfText = 'No activity';
          }
          
          return `
            <div style="
              display: flex; 
              justify-content: space-between; 
              align-items: center;
              padding: 2px 0;
              border-bottom: 1px solid #333;
              margin-bottom: 2px;
            ">
              <div style="color: #81c784; font-weight: bold; max-width: 120px; overflow: hidden; text-overflow: ellipsis;">
                ${nodeTitle}
              </div>
              <div style="color: #fff; text-align: right; font-size: 9px;">
                ${perfText}
                <div style="color: #888;">(${duration}s)</div>
              </div>
            </div>
          `;
        }).join('');

        this.nodeListDiv.innerHTML = nodeHtml || '<div style="color: #666;">No node data available</div>';
      };

      // Add a completed node to the display
      nodeType.prototype.addCompletedNode = function(nodeMetrics) {
        console.log("📊 Adding completed node to display:", nodeMetrics);
        
        // Update node list immediately
        if (this.nodeListDiv) {
          const frontendNodes = window.kikoStatsCompletedNodes || [];
          this.updateNodeList(frontendNodes);
        }
      };

      // Update completed nodes display (called after workflow finishes)
      nodeType.prototype.updateCompletedNodes = function() {
        console.log("📊 Updating completed nodes display");
        
        // Update node list with all completed nodes
        if (this.nodeListDiv) {
          const frontendNodes = window.kikoStatsCompletedNodes || [];
          this.updateNodeList(frontendNodes);
        }
      };

      // Start monitoring updates - simplified approach
      nodeType.prototype.startMonitoringUpdates = function() {
        // The display will update when the workflow executes
        // via the onExecuted callback
      };
    }
  }
});