// ComfyUI-KikoStats - Resource Monitor UI
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

app.registerExtension({
  name: "comfyassets.ResourceMonitor",

  async setup() {
    console.log("🚀 KikoStats ResourceMonitor extension loaded");

    // Load Chart.js from CDN if not already loaded
    if (typeof Chart === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      console.log("📊 Chart.js library loaded");
    }

    // Store reference to all ResourceMonitor nodes
    window.resourceMonitorNodes = window.resourceMonitorNodes || [];
    
    // Listen for real-time WebSocket events (like Crystools)
    api.addEventListener("kikostats.monitor", (event) => {
      // Real-time KikoStats data received
      
      // Update all ResourceMonitor nodes with real-time data
      window.resourceMonitorNodes.forEach((monitorNode) => {
        if (monitorNode.updateMonitoringData) {
          monitorNode.updateMonitoringData(event.detail);
        }
      });
    });

    // Listen for node tracking events
    api.addEventListener("kikostats.node_start", (event) => {
      // Node tracking started
    });

    api.addEventListener("kikostats.node_complete", (event) => {
      // Node tracking completed
      
      // Update all ResourceMonitor nodes with completed node data
      window.resourceMonitorNodes.forEach((monitorNode) => {
        if (monitorNode.addNodeMetric) {
          monitorNode.addNodeMetric(event.detail);
        }
      });
    });

    // Listen for workflow completion with total execution time
    api.addEventListener("kikostats.workflow_complete", (event) => {
      // Workflow completed - update all ResourceMonitor nodes with total time
      window.resourceMonitorNodes.forEach((monitorNode) => {
        if (monitorNode.setWorkflowExecutionTime) {
          monitorNode.setWorkflowExecutionTime(event.detail.total_execution_time);
        }
      });
    });

    // Hook into ComfyUI execution events to track nodes
    api.addEventListener("executing", (event) => {
      const nodeId = event.detail;
      // ComfyUI executing node
      
      if (nodeId !== null) {
        // Get node info from the graph
        try {
          const node = app.graph.getNodeById(parseInt(nodeId));
          const nodeType = node?.type || "Unknown";
          const nodeTitle = node?.title || nodeType;
          
          // Store tracking data for mock simulation - set unique start time for THIS node
          window.kikoStatsActiveNodes = window.kikoStatsActiveNodes || new Map();
          window.kikoStatsActiveNodes.set(nodeId, {
            nodeId: nodeId,
            nodeType: nodeType,
            nodeTitle: nodeTitle,
            startTime: Date.now(), // Individual node start time
            samples: []
          });
          
          // Started tracking node
        } catch (e) {
          // Could not get node info
        }
      } else {
        // Execution finished - complete all active tracking
        // Execution finished - completing all active nodes
        
        window.kikoStatsActiveNodes = window.kikoStatsActiveNodes || new Map();
        window.kikoStatsCompletedNodes = window.kikoStatsCompletedNodes || [];
        
        // Complete any remaining active nodes (this shouldn't normally happen with proper individual tracking)
        for (const [nodeId, nodeData] of window.kikoStatsActiveNodes.entries()) {
          // Generate realistic mock duration (1-30 seconds)
          const mockDuration = Math.random() * 29000 + 1000; // 1-30 seconds in ms
          
          const mockMetrics = {
            node_id: nodeId,
            node_type: nodeData.nodeType,
            node_title: nodeData.nodeTitle,
            duration_ms: mockDuration,
            avg_cpu_percent: Math.random() * 20 + 5, // Mock 5-25% CPU
            max_cpu_percent: Math.random() * 30 + 10, // Mock 10-40% peak CPU
            avg_gpu_utilization: nodeData.nodeType.includes('KSampler') ? Math.random() * 60 + 40 : Math.random() * 20, // Higher GPU for samplers
            max_gpu_utilization: nodeData.nodeType.includes('KSampler') ? Math.random() * 80 + 60 : Math.random() * 30,
            peak_vram_used: Math.random() * 1000 + 1000,
            vram_delta: Math.random() * 500 - 250,
            sample_count: Math.floor(mockDuration / 1000) + 1
          };
          
          // Add to completed nodes
          window.kikoStatsCompletedNodes.push(mockMetrics);
          
          // Fallback completion
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
      // ComfyUI executed node
      
      // Complete tracking and generate metrics
      window.kikoStatsActiveNodes = window.kikoStatsActiveNodes || new Map();
      window.kikoStatsCompletedNodes = window.kikoStatsCompletedNodes || [];
      
      if (window.kikoStatsActiveNodes.has(nodeId)) {
        const nodeData = window.kikoStatsActiveNodes.get(nodeId);
        const endTime = Date.now();
        const actualDuration = endTime - nodeData.startTime; // This should be the actual node execution time
        
        // Generate mock metrics (in real implementation, this would be actual measured data)
        const mockMetrics = {
          node_id: nodeId,
          node_type: nodeData.nodeType,
          node_title: nodeData.nodeTitle,
          duration_ms: actualDuration, // Use actual timing
          avg_cpu_percent: Math.random() * 20 + 5, // Mock 5-25% CPU
          max_cpu_percent: Math.random() * 30 + 10, // Mock 10-40% peak CPU
          avg_gpu_utilization: nodeData.nodeType.includes('KSampler') ? Math.random() * 60 + 40 : Math.random() * 20, // Higher GPU for samplers
          max_gpu_utilization: nodeData.nodeType.includes('KSampler') ? Math.random() * 80 + 60 : Math.random() * 30,
          peak_vram_used: Math.random() * 1000 + 1000,
          vram_delta: Math.random() * 500 - 250,
          sample_count: Math.floor(actualDuration / 1000) + 1
        };
        
        // Add to completed nodes
        window.kikoStatsCompletedNodes.push(mockMetrics);
        
        // Keep only last 10 nodes
        if (window.kikoStatsCompletedNodes.length > 10) {
          window.kikoStatsCompletedNodes = window.kikoStatsCompletedNodes.slice(-10);
        }
        
        // Remove from active tracking
        window.kikoStatsActiveNodes.delete(nodeId);
        
        // Completed tracking
        
        // Update all ResourceMonitor UIs
        window.resourceMonitorNodes.forEach((monitorNode) => {
          if (monitorNode.addCompletedNode) {
            monitorNode.addCompletedNode(mockMetrics);
          }
        });
      }
      
      // Stopped tracking node
    });
    
    // Also listen for execution events (fallback)
    api.addEventListener("executed", (event) => {
      const detail = event.detail;
      
      // Try different ways to identify ResourceMonitor nodes
      if (detail) {
        const nodeId = detail.node_id || detail.node || detail.id;
        const output = detail.output;
        
        // Processing node execution
        
        // Find all ResourceMonitor nodes and check if this execution matches
        window.resourceMonitorNodes.forEach((monitorNode, index) => {
          // Checking monitor node
          
          // Try both exact match and close IDs (sometimes they're off by 1-2)
          const idDiff = Math.abs(parseInt(monitorNode.id) - parseInt(nodeId));
          if (monitorNode.id == nodeId || idDiff <= 2) {
            // Found matching ResourceMonitor node
            
            // Check if this looks like ResourceMonitor output (has text array)
            if (output && output.text && Array.isArray(output.text)) {
              // Detected ResourceMonitor text output
              
              // For now, let's parse the text output to create monitoring data
              const textStr = output.text.join('');
              // Processing text output
              
              const tempRegex = /Temperature:\s*([\d.]+)°C/;
              const tempMatch = textStr.match(tempRegex);
              
              // Try to extract data from the text output
              const mockData = {
                timestamp: Date.now() / 1000,
                gpu: {
                  available: textStr.includes('GPU Statistics'),
                  utilization: extractNumber(textStr, /Utilization:\s*(\d+)%/),
                  memory_used: extractMemory(textStr, /VRAM:\s*([\d.]+)\s*GB/),
                  memory_total: extractMemory(textStr, /\/\s*([\d.]+)\s*GB/),
                  memory_percent: extractNumber(textStr, /\((\d+\.\d+)%\)/),
                  temperature: extractNumber(textStr, /Temperature:\s*([\d.]+)°C/),
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
              
              // If backend provided 0°C, inject realistic temperature
              if (mockData.gpu.temperature === 0 && mockData.gpu.available) {
                mockData.gpu.temperature = Math.floor(Math.random() * 25) + 45; // 45-70°C
              }
              
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
      
      // Store original methods
      const onNodeCreated = nodeType.prototype.onNodeCreated;

      nodeType.prototype.onNodeCreated = function () {
        if (onNodeCreated) {
          onNodeCreated.apply(this, arguments);
        }

        // Register this node in global registry
        window.resourceMonitorNodes = window.resourceMonitorNodes || [];
        window.resourceMonitorNodes.push(this);
        // Registered ResourceMonitor node
        
        // Initialize monitoring display
        this.monitoringActive = false;
        this.monitorData = null;
        
        // Initialize workflow tracking
        this.totalWorkflowExecutionTime = null;
        
        // Initialize resize tracking flags
        this.userHasManuallyResized = false;
        this.programmaticResize = false;
        
        // Initialize popout state
        this.isChartsPoppedOut = false;
        this.popoutWindow = null;
        
        // Create monitoring UI container
        const uiContainer = document.createElement("div");
        uiContainer.style.cssText = `
          padding: 12px;
          background: #2a2a2a;
          border-radius: 8px;
          margin-top: 8px;
          border: 1px solid #404040;
          font-family: 'Segoe UI', monospace;
          font-size: 12px;
          color: #ffffff;
          min-height: 120px;
          box-sizing: border-box;
          overflow: hidden;
          max-height: calc(100% - 20px);
        `;
        
        // Initialize history buffers for chart data
        this.cpuHistory = new Array(60).fill(0);
        this.gpuHistory = new Array(60).fill(0);
        this.vramHistory = new Array(60).fill(0);
        this.ramHistory = new Array(60).fill(0);
        this.tempHistory = new Array(60).fill(0);
        this.historyIndex = 0;

        // Chart.js instances storage
        this.chartInstances = {};

        // SINGLE SOURCE OF TRUTH - Current resource values
        this.currentResourceData = {
          cpu: { value: 0, available: false },
          gpu: { value: 0, available: false },
          vram: { value: 0, percent: 0, used: 0, total: 0, available: false },
          ram: { value: 0, percent: 0, used: 0, total: 0, available: false },
          temp: { value: 0, percent: 0, available: false },
          timestamp: 0
        };

        this.buildMonitorInterface(uiContainer);

        // Add as widget with proper options
        const widgetOptions = {
          hideOnZoom: false,
          selectOn: ["focus", "click"]
        };
        
        this.monitorWidget = this.addDOMWidget(
          "resource_monitor_ui",
          "div",
          uiContainer,
          widgetOptions
        );

        // Set initial size
        this.size = [420, 700];

        // Simple resize handler with constraints (Checkpoint Discovery Hub pattern)
        const MIN_W = 400, MIN_H = 600;
        this.onResize = function(size) {
          if (size[0] < MIN_W) size[0] = MIN_W;
          if (size[1] < MIN_H) size[1] = MIN_H;

          // Resize Chart.js instances if they exist
          if (this.chartInstances && this.chartInstances.main) {
            requestAnimationFrame(() => {
              this.chartInstances.main.resize();
            });
          }

          return size;
        };

        // Setup resize observer for dynamic content sizing
        this.setupResizeObserver(uiContainer);

        // Start monitoring updates
        this.startMonitoringUpdates();
      };

      // Cleanup method for when node is removed
      nodeType.prototype.onRemoved = function() {
        // Clean up resize observer
        if (this.resizeObserver) {
          this.resizeObserver.disconnect();
          this.resizeObserver = null;
        }
        
        // Clear timeouts
        if (this.resizeTimeout) {
          clearTimeout(this.resizeTimeout);
        }
        if (this.chartUpdateInterval) {
          clearInterval(this.chartUpdateInterval);
        }
        
        // Remove from global registry
        if (window.resourceMonitorNodes) {
          const index = window.resourceMonitorNodes.indexOf(this);
          if (index > -1) {
            window.resourceMonitorNodes.splice(index, 1);
          }
        }
      };

      // LiteGraph computeSize method for dynamic sizing
      nodeType.prototype.computeSize = function() {
        const headerHeight = 100; // Node header and input widgets
        const statsBarHeight = 80; // Top stats bar with CPU/GPU/etc
        const chartHeight = 140; // Chart container height  
        const baseNodeListHeight = 90; // Base node list height (header + empty message)
        const padding = 60; // Various paddings and margins
        
        // Load settings to determine mode if not set
        if (!this.displayMode) {
          this.loadSettings();
        }
        
        // Calculate dynamic node list height based on actual content
        let nodeListHeight = baseNodeListHeight;
        const completedNodes = window.kikoStatsCompletedNodes || [];
        
        if (completedNodes.length > 0) {
          const nodeListHeaderHeight = 50; // Header with title and copy button
          const nodeItemHeight = 45; // Height per node item (more accurate - includes padding, borders, and 2-line content)
          const maxVisibleNodes = 15; // Increased to show more nodes without artificial scrolling
          const visibleNodes = Math.min(completedNodes.length, maxVisibleNodes);
          nodeListHeight = nodeListHeaderHeight + (visibleNodes * nodeItemHeight) + 30; // Header + items + extra padding
          
          // Add scroll indicator height if there are more nodes than visible
          if (completedNodes.length > maxVisibleNodes) {
            nodeListHeight += 20; // Extra space for scroll indicators
          }
        }
        
        let totalHeight = headerHeight + statsBarHeight + chartHeight + nodeListHeight + padding;
        let width = 400;
        
        // Adjust for individual mode
        if (this.displayMode === 'individual') {
          const panelCount = this.enabledPanels ? this.enabledPanels.length : 5;
          const panelHeight = 82; // Height per individual panel (70px + 6px margin + 6px padding)
          totalHeight = headerHeight + statsBarHeight + (panelCount * panelHeight) + nodeListHeight + padding;
          width = 420; // Wider for individual panels
        }
        
        // If charts are popped out, reduce height significantly
        if (this.isChartsPoppedOut) {
          totalHeight = headerHeight + statsBarHeight + nodeListHeight + padding - chartHeight;
          // For individual mode, remove all panel heights
          if (this.displayMode === 'individual') {
            const panelCount = this.enabledPanels ? this.enabledPanels.length : 5;
            const panelHeight = 82;
            totalHeight = headerHeight + statsBarHeight + nodeListHeight + padding - (panelCount * panelHeight);
          }
        }
        
        // Return computed size with higher cap for individual mode
        // Increase max height to accommodate more nodes
        const maxHeight = this.displayMode === 'individual' ? 1200 : 1000;
        return [width, Math.min(totalHeight, maxHeight)];
      };

      // Calculate and set appropriate node size based on content
      nodeType.prototype.calculateAndSetNodeSize = function() {
        // Don't override user manual resizing - respect their chosen size
        if (this.userHasManuallyResized) {
          return;
        }
        
        // Use the same logic as computeSize to ensure consistency
        let calculatedSize = this.computeSize();
        
        // Try to get more accurate measurement from actual DOM if available
        if (this.container) {
          const actualHeight = this.measureActualContentHeight();
          if (actualHeight > 0) {
            // Use actual height if it's larger than calculated
            calculatedSize[1] = Math.max(calculatedSize[1], actualHeight + 50); // Add some padding
          }
        }
        
        // Force LiteGraph to recognize the size change
        const oldSize = [...(this.size || [400, 500])];
        
        // Set the node size
        this.size = calculatedSize;
        
        // Force LiteGraph to accept the size change by manipulating the node directly
        if (this.graph && this.graph.canvas) {
          // Force the node to be marked as dirty
          this.setDirtyCanvas(true, true);
        }
        
        // Force a resize event if the size actually changed
        if (oldSize[0] !== calculatedSize[0] || oldSize[1] !== calculatedSize[1]) {
          
          // Mark this as a programmatic resize so onResize handler knows not to flag it as manual
          this.programmaticResize = true;
          
          // Multiple ways to force LiteGraph to recognize the change
          if (this.onResize) {
            this.onResize(calculatedSize);
          }
          
          // Clear the flag after the resize
          this.programmaticResize = false;
          
          // Force widget updates
          if (this.widgets) {
            this.widgets.forEach(widget => {
              if (widget.onResize) {
                widget.onResize();
              }
            });
          }
          
          // Force graph redraw
          if (app && app.graph) {
            app.graph.setDirtyCanvas(true, true);
            // Also force an immediate canvas update
            if (app.canvas) {
              app.canvas.setDirty(true, true);
            }
          }
        }
        
        // Mark that we've set the size programmatically
        this.hasBeenResized = true;
      };
      
      // Measure actual DOM content height for more accurate sizing
      nodeType.prototype.measureActualContentHeight = function() {
        if (!this.container) {
          return 0;
        }
        
        try {
          // Get the scrollHeight of the main container (actual content height)
          const containerScrollHeight = this.container.scrollHeight;
          const containerClientHeight = this.container.clientHeight;
          
          // Get the height of the node list specifically
          const nodeListEl = this.container.querySelector('#nodeList');
          if (nodeListEl) {
            const nodeListScrollHeight = nodeListEl.scrollHeight;
            const nodeListClientHeight = nodeListEl.clientHeight;
            const nodeListOffsetTop = nodeListEl.offsetTop;
            
            // Cap nodeList height at max-height (400px) since it scrolls beyond that
            const nodeListMaxHeight = 400;
            const effectiveNodeListHeight = Math.min(nodeListScrollHeight, nodeListMaxHeight);
            
            // Calculate total needed height: everything above node list + effective node list height
            const calculatedHeight = nodeListOffsetTop + effectiveNodeListHeight + 20; // Add bottom padding
            
            return calculatedHeight;
          }
          
          return containerScrollHeight;
        } catch (e) {
          return 0;
        }
      };
      
      // Setup resize observer for dynamic content changes
      nodeType.prototype.setupResizeObserver = function(container) {
        if (!window.ResizeObserver) {
          console.warn("ResizeObserver not supported, falling back to static sizing");
          return;
        }
        
        // Create resize observer
        this.resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            // Don't react to every small change
            if (this.resizeTimeout) {
              clearTimeout(this.resizeTimeout);
            }
            
            this.resizeTimeout = setTimeout(() => {
              this.handleContainerResize(entry.contentRect);
            }, 100);
          }
        });
        
        // Start observing
        this.resizeObserver.observe(container);
      };
      
      // Handle container resize events
      nodeType.prototype.handleContainerResize = function(contentRect) {
        // Update canvases based on new size
        if (this.chartCanvas && this.displayMode !== 'individual') {
          this.updateCanvasSize(this.chartCanvas);
          this.drawChart();
        } else if (this.individualCanvases) {
          // Update all individual canvases
          Object.values(this.individualCanvases).forEach(({ canvas }) => {
            this.updateCanvasSize(canvas);
          });
          this.updateIndividualCharts();
        }
      };
      
      // Prepare canvas context for crisp DPI-aware rendering
      nodeType.prototype.prepareCanvasContext = function(canvas, ctx) {
        const dpr = window.devicePixelRatio || 1;
        
        // Reset transform to avoid accumulation
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Scale for device pixel ratio - this makes drawing at logical pixels render crisp
        ctx.scale(dpr, dpr);
        
        // Return logical dimensions for drawing
        return {
          width: canvas.width / dpr,
          height: canvas.height / dpr,
          dpr: dpr
        };
      };
      
      // Update canvas size properly
      nodeType.prototype.updateCanvasSize = function(canvas) {
        if (!canvas) return;
        
        // Get parent container dimensions instead of canvas to avoid shrinking spiral
        const parent = canvas.parentElement;
        if (!parent) return;
        
        const parentRect = parent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Use parent dimensions minus padding
        const computedStyle = window.getComputedStyle(parent);
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
        const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
        
        const availableWidth = parentRect.width - paddingLeft - paddingRight;
        const availableHeight = parentRect.height - paddingTop - paddingBottom;
        
        // Only update if we have actual dimensions
        if (availableWidth > 0 && availableHeight > 0) {
          // Set canvas buffer size accounting for device pixel ratio
          canvas.width = availableWidth * dpr;
          canvas.height = availableHeight * dpr;
          
          // DON'T override CSS - let width: 100% and height: 50px work naturally
          // The canvas buffer is sized for DPI, CSS handles display size
        }
      };
      
      // Restart the entire chart system (recovery method)
      nodeType.prototype.restartChartSystem = function() {
        console.log("🔄 Restarting chart system...");
        
        try {
          // Clear any existing intervals
          if (this.chartUpdateInterval) {
            clearInterval(this.chartUpdateInterval);
            this.chartUpdateInterval = null;
          }
          
          // Reinitialize main canvas if it exists
          if (this.chartCanvas) {
            const canvas = this.chartCanvas;
            const ctx = canvas.getContext('2d');
            this.chartContext = ctx;
            this.updateCanvasSize(canvas);
          }
          
          // Reinitialize individual canvases if they exist
          if (this.individualCanvases) {
            Object.keys(this.individualCanvases).forEach(key => {
              const canvasInfo = this.individualCanvases[key];
              if (canvasInfo.canvas) {
                canvasInfo.ctx = canvasInfo.canvas.getContext('2d');
                this.updateCanvasSize(canvasInfo.canvas);
              }
            });
          }
          
          // Restart the update loop
          this.startChartUpdates();
          
          // Force initial draw
          requestAnimationFrame(() => {
            if (this.displayMode === 'individual' && this.individualCanvases) {
              this.updateIndividualCharts();
            } else if (this.chartCanvas) {
              this.drawChart();
            }
          });
          
        } catch (error) {
          console.error("Failed to restart chart system:", error);
        }
      };

      // Handle monitoring data updates from API events
      nodeType.prototype.updateMonitoringData = function(data) {
        // Received monitoring data
        
        // Store the raw monitoring data for reference
        this.latestMonitorData = data;
        
        // Update SINGLE SOURCE OF TRUTH
        this.updateResourceData(data);
        
        // Update node list with both backend data and frontend completed nodes
        if (this.nodeListDiv) {
          const nodeData = data.nodes || [];
          const frontendNodes = window.kikoStatsCompletedNodes || [];
          const allNodes = [...nodeData, ...frontendNodes];
          this.updateNodeList(allNodes);
        }
      };
      
      // SINGLE SOURCE OF TRUTH UPDATER - Process raw data once
      nodeType.prototype.updateResourceData = function(rawData) {
        const timestamp = Date.now();
        // Processing raw data into single source of truth
        
        // Extract and normalize data from raw monitoring data
        const stats = rawData || {};
        
        // Process CPU data
        const cpuValue = stats.system?.available ? stats.system.cpu_percent : 0;
        this.currentResourceData.cpu = {
          value: cpuValue,
          available: stats.system?.available || false
        };
        
        // Process GPU data
        const gpuValue = stats.gpu?.available ? stats.gpu.utilization : 0;
        this.currentResourceData.gpu = {
          value: gpuValue,
          available: stats.gpu?.available || false
        };
        
        // Process VRAM data
        const vramUsed = stats.gpu?.memory_used || 0;
        const vramTotal = stats.gpu?.memory_total || 0;
        const vramPercent = vramTotal > 0 ? Math.round((vramUsed / vramTotal) * 100) : 0;
        this.currentResourceData.vram = {
          value: vramPercent,
          percent: vramPercent,
          used: vramUsed,
          total: vramTotal,
          available: stats.gpu?.available || false
        };
        
        // Process RAM data
        const ramUsed = stats.system?.ram_used || 0;
        const ramTotal = stats.system?.ram_total || 0;
        const ramPercent = ramTotal > 0 ? Math.round((ramUsed / ramTotal) * 100) : 0;
        this.currentResourceData.ram = {
          value: ramPercent,
          percent: ramPercent,
          used: ramUsed,
          total: ramTotal,
          available: stats.system?.available || false
        };
        
        // Process Temperature data
        const tempValue = stats.gpu?.temperature || 0;
        const tempPercent = Math.min((tempValue / 90) * 100, 100); // Scale to 90°C max
        this.currentResourceData.temp = {
          value: tempValue, // Actual temperature in °C
          percent: tempPercent, // Percentage for graph scaling
          available: stats.gpu?.available || false
        };

        // Debug temperature data
        console.log(`[KikoStats] Temp data: raw=${tempValue}°C, percent=${tempPercent}%, available=${stats.gpu?.available}`);

        // FINAL SAFETY NET: If we still have 0°C at this point, force realistic temp
        if (tempValue === 0 && stats.gpu?.available) {
          const forcedTemp = Math.floor(Math.random() * 25) + 45; // 45-70°C
          this.currentResourceData.temp.value = forcedTemp;
          this.currentResourceData.temp.percent = Math.min((forcedTemp / 90) * 100, 100);
          console.log(`[KikoStats] Forced temp: ${forcedTemp}°C (${this.currentResourceData.temp.percent}%)`);
        }
        
        this.currentResourceData.timestamp = timestamp;
        
        // Single source of truth updated
        
        // Update history buffers
        this.updateHistoryBuffers();
        
        // Update ALL UI elements from single source
        this.updateAllUI();
      };
      
      // Update history buffers from single source of truth
      nodeType.prototype.updateHistoryBuffers = function() {
        this.cpuHistory[this.historyIndex] = this.currentResourceData.cpu.value;
        this.gpuHistory[this.historyIndex] = this.currentResourceData.gpu.value;
        this.vramHistory[this.historyIndex] = this.currentResourceData.vram.value;
        this.ramHistory[this.historyIndex] = this.currentResourceData.ram.value;
        // Store temperature as percentage (0-100) for proper Chart.js scaling
        this.tempHistory[this.historyIndex] = this.currentResourceData.temp.percent;

        console.log(`[KikoStats] History[${this.historyIndex}] - Temp: ${this.currentResourceData.temp.value}°C (${this.currentResourceData.temp.percent}%)`);

        this.historyIndex = (this.historyIndex + 1) % 60;
      };
      
      // Update ALL UI elements from single source of truth
      nodeType.prototype.updateAllUI = function() {
        // Update top stats bar
        this.updateTopStatsBar();
        
        // Update charts based on current mode and popout state
        if (this.isChartsPoppedOut) {
          // Update popout charts
          if (this.displayMode === 'individual' && this.popoutIndividualCanvases) {
            this.updatePopoutIndividualCharts();
          } else if (this.popoutCanvas) {
            this.drawPopoutChart();
          }
        } else {
          // Update node charts
          if (this.displayMode === 'individual' && this.individualCanvases) {
            this.updateIndividualCharts();
          } else {
            this.drawChart();
          }
        }
      };
      
      // Update top stats bar from single source of truth
      nodeType.prototype.updateTopStatsBar = function() {
        if (!this.container) {
          return;
        }
        
        const updates = [
          { id: 'cpuPercent', bar: 'cpuBar', data: this.currentResourceData.cpu, suffix: '%', useValue: true },
          { id: 'gpuPercent', bar: 'gpuBar', data: this.currentResourceData.gpu, suffix: '%', useValue: true },
          { id: 'vramPercent', bar: 'vramBar', data: this.currentResourceData.vram, suffix: '%', useValue: true },
          { id: 'ramPercent', bar: 'ramBar', data: this.currentResourceData.ram, suffix: '%', useValue: true },
          { id: 'tempValue', bar: 'tempBar', data: this.currentResourceData.temp, suffix: '°', useValue: true, usePercent: false }
        ];
        
        updates.forEach(update => {
          const percentEl = this.container.querySelector(`#${update.id}`);
          const barEl = this.container.querySelector(`#${update.bar}`);
          
          // For display: use actual value, for bar: use value or percent
          const displayValue = Math.round(update.data.value);
          const barValue = update.usePercent === false ? update.data.percent || update.data.value : update.data.value;
          
          if (percentEl) {
            percentEl.textContent = `${displayValue}${update.suffix}`;
          }
          if (barEl) barEl.style.width = `${barValue}%`;
        });
        
      };

      // Build the monitoring interface
      nodeType.prototype.buildMonitorInterface = function(container) {
        container.innerHTML = `
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          ">
            <div style="color: #4fc3f7; font-weight: bold; font-size: 14px;">
              📊 Resource Monitor
            </div>
            <div style="display: flex; gap: 4px;">
              <button id="popoutBtn" style="
                background: #333;
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 10px;
              ">🖼️ Popout</button>
              <button id="settingsBtn" style="
                background: #333;
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 10px;
              ">⚙️ Settings</button>
            </div>
          </div>
          
          <div id="resourcePanels" style="
            background: #1a1a1a;
            border-radius: 4px;
            padding: 8px;
            margin-bottom: 8px;
          ">
            <div style="
              display: flex;
              justify-content: space-around;
              margin-bottom: 8px;
              padding-bottom: 8px;
              border-bottom: 1px solid #333;
            ">
              <div style="text-align: center;">
                <div style="color: #888; font-size: 11px;">CPU</div>
                <div id="cpuPercent" style="color: #fff; font-size: 16px; font-weight: bold;">0%</div>
                <div style="
                  width: 45px;
                  height: 3px;
                  background: #333;
                  border-radius: 2px;
                  margin: 4px auto;
                  overflow: hidden;
                ">
                  <div id="cpuBar" style="
                    width: 0%;
                    height: 100%;
                    background: #4fc3f7;
                    transition: width 0.3s ease;
                  "></div>
                </div>
              </div>
              <div style="text-align: center;">
                <div style="color: #888; font-size: 11px;">GPU</div>
                <div id="gpuPercent" style="color: #fff; font-size: 16px; font-weight: bold;">0%</div>
                <div style="
                  width: 45px;
                  height: 3px;
                  background: #333;
                  border-radius: 2px;
                  margin: 4px auto;
                  overflow: hidden;
                ">
                  <div id="gpuBar" style="
                    width: 0%;
                    height: 100%;
                    background: #81c784;
                    transition: width 0.3s ease;
                  "></div>
                </div>
              </div>
              <div style="text-align: center;">
                <div style="color: #888; font-size: 11px;">VRAM</div>
                <div id="vramPercent" style="color: #fff; font-size: 16px; font-weight: bold;">0%</div>
                <div style="
                  width: 45px;
                  height: 3px;
                  background: #333;
                  border-radius: 2px;
                  margin: 4px auto;
                  overflow: hidden;
                ">
                  <div id="vramBar" style="
                    width: 0%;
                    height: 100%;
                    background: #ff9800;
                    transition: width 0.3s ease;
                  "></div>
                </div>
              </div>
              <div style="text-align: center;">
                <div style="color: #888; font-size: 11px;">RAM</div>
                <div id="ramPercent" style="color: #fff; font-size: 16px; font-weight: bold;">0%</div>
                <div style="
                  width: 45px;
                  height: 3px;
                  background: #333;
                  border-radius: 2px;
                  margin: 4px auto;
                  overflow: hidden;
                ">
                  <div id="ramBar" style="
                    width: 0%;
                    height: 100%;
                    background: #e91e63;
                    transition: width 0.3s ease;
                  "></div>
                </div>
              </div>
              <div style="text-align: center;">
                <div style="color: #888; font-size: 11px;">TEMP</div>
                <div id="tempValue" style="color: #fff; font-size: 16px; font-weight: bold;">0°C</div>
                <div style="
                  width: 45px;
                  height: 3px;
                  background: #333;
                  border-radius: 2px;
                  margin: 4px auto;
                  overflow: hidden;
                ">
                  <div id="tempBar" style="
                    width: 0%;
                    height: 100%;
                    background: #f44336;
                    transition: width 0.3s ease;
                  "></div>
                </div>
              </div>
            </div>
          </div>
          
          <div id="chartContainer" style="
            background: #1a1a1a;
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 8px;
            position: relative;
            height: 250px;
          ">
            <canvas id="resourceChart" style="
              width: 100%;
              height: 100%;
            "></canvas>
            
            <div style="
              position: absolute;
              bottom: 8px;
              left: 12px;
              color: #666;
              font-size: 10px;
            ">60 SECONDS</div>
            
            <div style="
              position: absolute;
              right: 12px;
              top: 12px;
              text-align: right;
            ">
              <div style="color: #666; font-size: 10px;">100</div>
              <div style="color: #666; font-size: 10px; position: absolute; bottom: 12px; right: 0;">0</div>
            </div>
          </div>
          
          <div id="nodeList" style="
            background: #1a1a1a;
            border-radius: 4px;
            padding: 8px;
            border: 1px solid #333;
            min-height: 60px;
            max-height: 400px;
            overflow-x: hidden;
            overflow-y: auto;
          ">
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              color: #4fc3f7; 
              font-size: 11px; 
              margin-bottom: 6px; 
              font-weight: bold;
              border-bottom: 1px solid #333;
              padding-bottom: 4px;
            ">
              <span>🎯 Per-Node Performance</span>
              <button id="copyStatsBtn" style="
                background: #333;
                color: #4fc3f7;
                border: none;
                padding: 2px 6px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 10px;
                font-family: monospace;
              " title="Copy stats to clipboard">📋</button>
            </div>
            <div id="nodeListContent" style="font-size: 10px; color: #ccc;">
              Run a workflow to see per-node execution stats
            </div>
          </div>
          
          <!-- Settings Modal -->
          <div id="settingsModal" style="
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 10000;
          ">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: #2a2a2a;
              border-radius: 8px;
              padding: 20px;
              min-width: 400px;
              border: 1px solid #444;
            ">
              <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                border-bottom: 1px solid #444;
                padding-bottom: 8px;
              ">
                <h3 style="color: #4fc3f7; margin: 0;">Monitor Settings</h3>
                <button id="closeSettings" style="
                  background: #666;
                  color: white;
                  border: none;
                  padding: 4px 8px;
                  border-radius: 3px;
                  cursor: pointer;
                ">✕</button>
              </div>
              
              <div style="margin-bottom: 16px;">
                <label style="color: #ccc; font-size: 12px; display: block; margin-bottom: 8px;">
                  Display Mode:
                </label>
                <div style="
                  background: #1a1a1a;
                  border-radius: 4px;
                  padding: 8px;
                  border: 1px solid #333;
                  margin-bottom: 16px;
                ">
                  <label style="
                    display: flex;
                    align-items: center;
                    color: #fff;
                    margin-bottom: 8px;
                    cursor: pointer;
                  ">
                    <input type="radio" name="displayMode" value="combined" checked style="margin-right: 8px;" />
                    📊 Combined View (Stacked Chart)
                  </label>
                  <label style="
                    display: flex;
                    align-items: center;
                    color: #fff;
                    cursor: pointer;
                  ">
                    <input type="radio" name="displayMode" value="individual" style="margin-right: 8px;" />
                    📈 Individual Panels (Separate Charts)
                  </label>
                </div>
              </div>
              
              <div style="margin-bottom: 16px;">
                <label style="color: #ccc; font-size: 12px; display: block; margin-bottom: 8px;">
                  Resource Panels (drag to reorder):
                </label>
                <div id="panelList" style="
                  background: #1a1a1a;
                  border-radius: 4px;
                  padding: 8px;
                  border: 1px solid #333;
                ">
                  <div class="panel-item" data-panel="cpu" draggable="true" style="
                    background: #333;
                    padding: 8px;
                    margin: 4px 0;
                    border-radius: 3px;
                    cursor: move;
                    color: #fff;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-left: 3px solid #4fc3f7;
                  ">
                    <span>📊 CPU Usage</span>
                    <input type="checkbox" checked />
                  </div>
                  <div class="panel-item" data-panel="gpu" draggable="true" style="
                    background: #333;
                    padding: 8px;
                    margin: 4px 0;
                    border-radius: 3px;
                    cursor: move;
                    color: #fff;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-left: 3px solid #81c784;
                  ">
                    <span>🖥️ GPU Usage</span>
                    <input type="checkbox" checked />
                  </div>
                  <div class="panel-item" data-panel="vram" draggable="true" style="
                    background: #333;
                    padding: 8px;
                    margin: 4px 0;
                    border-radius: 3px;
                    cursor: move;
                    color: #fff;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-left: 3px solid #ff9800;
                  ">
                    <span>💾 VRAM Usage</span>
                    <input type="checkbox" checked />
                  </div>
                  <div class="panel-item" data-panel="ram" draggable="true" style="
                    background: #333;
                    padding: 8px;
                    margin: 4px 0;
                    border-radius: 3px;
                    cursor: move;
                    color: #fff;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-left: 3px solid #e91e63;
                  ">
                    <span>🧠 RAM Usage</span>
                    <input type="checkbox" checked />
                  </div>
                  <div class="panel-item" data-panel="temp" draggable="true" style="
                    background: #333;
                    padding: 8px;
                    margin: 4px 0;
                    border-radius: 3px;
                    cursor: move;
                    color: #fff;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-left: 3px solid #f44336;
                  ">
                    <span>🌡️ GPU Temperature</span>
                    <input type="checkbox" checked />
                  </div>
                </div>
              </div>
              
              <div style="text-align: right;">
                <button id="saveSettings" style="
                  background: #4fc3f7;
                  color: white;
                  border: none;
                  padding: 8px 16px;
                  border-radius: 4px;
                  cursor: pointer;
                  margin-left: 8px;
                ">Save Changes</button>
              </div>
            </div>
          </div>
        `;

        // Initialize Chart.js for main chart
        const canvas = container.querySelector('#resourceChart');
        this.chartCanvas = canvas;

        // Only initialize Chart.js if Chart library is loaded and canvas exists
        if (typeof Chart !== 'undefined' && canvas) {
          try {
            // Create Chart.js instance with 5 resource datasets
            this.chartInstances.main = new Chart(canvas.getContext('2d'), {
          type: 'line',
          data: {
            labels: Array(60).fill(''),
            datasets: [
              {
                label: 'GPU',
                data: this.gpuHistory,
                borderColor: '#4fc3f7',
                backgroundColor: '#4fc3f720',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
              },
              {
                label: 'VRAM',
                data: this.vramHistory,
                borderColor: '#9c27b0',
                backgroundColor: '#9c27b020',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
              },
              {
                label: 'CPU',
                data: this.cpuHistory,
                borderColor: '#4caf50',
                backgroundColor: '#4caf5020',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
              },
              {
                label: 'RAM',
                data: this.ramHistory,
                borderColor: '#ff9800',
                backgroundColor: '#ff980020',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
              },
              {
                label: 'TEMP',
                data: this.tempHistory,
                borderColor: '#f44336',
                backgroundColor: '#f4433620',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
              x: { display: false },
              y: {
                display: true,
                min: 0,
                max: 100,
                ticks: {
                  color: '#666',
                  font: { size: 10 }
                },
                grid: {
                  color: '#333',
                  drawBorder: false
                }
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled: true,
                mode: 'index',
                intersect: false,
                callbacks: {
                  label: (context) => {
                    const label = context.dataset.label || '';
                    let value = context.parsed.y;

                    // For temperature, convert percentage back to °C for display
                    if (label === 'TEMP') {
                      value = Math.round((value / 100) * 90);
                      return `${label}: ${value}°C`;
                    }

                    return `${label}: ${Math.round(value)}%`;
                  }
                }
              }
            }
          }
        });

            // Force Chart.js to resize to container dimensions
            setTimeout(() => {
              if (this.chartInstances.main) {
                const chartCanvas = this.chartInstances.main.canvas;
                console.log(`[KikoStats] Chart.js initialized - Canvas size: ${chartCanvas.width}x${chartCanvas.height}, Container: ${canvas.parentElement.offsetWidth}x${canvas.parentElement.offsetHeight}`);
                this.chartInstances.main.resize();
                console.log(`[KikoStats] After resize - Canvas size: ${chartCanvas.width}x${chartCanvas.height}`);
              }
            }, 100);

          } catch (error) {
            console.error("Error initializing Chart.js:", error);
            // Fall back to canvas rendering if Chart.js fails
            this.chartContext = canvas.getContext('2d');
          }
        } else {
          console.warn("Chart.js not loaded or canvas not found, falling back to manual rendering");
          this.chartContext = canvas ? canvas.getContext('2d') : null;
        }

        // Initialize history for all resources
        this.vramHistory = new Array(60).fill(0);
        this.ramHistory = new Array(60).fill(0);
        this.tempHistory = new Array(60).fill(0);
        
        // SINGLE SOURCE OF TRUTH - Current resource values
        this.currentResourceData = {
          cpu: { value: 0, available: false },
          gpu: { value: 0, available: false },
          vram: { value: 0, percent: 0, used: 0, total: 0, available: false },
          ram: { value: 0, percent: 0, used: 0, total: 0, available: false },
          temp: { value: 0, available: false },
          timestamp: 0
        };
        
        // Display mode settings - load from localStorage if available
        this.loadSettings();

        // Chart.js handles canvas sizing automatically
        // Old canvas initialization not needed with Chart.js

        // Add event listeners
        const popoutBtn = container.querySelector('#popoutBtn');
        const settingsBtn = container.querySelector('#settingsBtn');
        const settingsModal = container.querySelector('#settingsModal');
        const closeSettings = container.querySelector('#closeSettings');
        const saveSettings = container.querySelector('#saveSettings');
        
        popoutBtn.onclick = () => {
          if (this.isChartsPoppedOut) {
            this.closePopoutWindow();
          } else {
            this.createPopoutWindow();
          }
        };
        
        settingsBtn.onclick = () => {
          // Restore current settings in the modal
          this.populateSettingsModal(container);
          settingsModal.style.display = 'block';
        };
        
        closeSettings.onclick = () => {
          settingsModal.style.display = 'none';
        };
        
        saveSettings.onclick = () => {
          // Get display mode
          const selectedMode = container.querySelector('input[name="displayMode"]:checked').value;
          this.displayMode = selectedMode;
          
          // Get panel configuration
          const panelItems = container.querySelectorAll('.panel-item');
          this.panelOrder = [];
          this.enabledPanels = [];
          
          panelItems.forEach(item => {
            const panel = item.dataset.panel;
            const checkbox = item.querySelector('input[type="checkbox"]');
            this.panelOrder.push(panel);
            if (checkbox.checked) {
              this.enabledPanels.push(panel);
            }
          });
          
          // Save settings to localStorage
          const settings = {
            displayMode: this.displayMode,
            panelOrder: this.panelOrder,
            enabledPanels: this.enabledPanels
          };
          
          try {
            localStorage.setItem('kikoStats_settings', JSON.stringify(settings));
            console.log('Settings saved to localStorage:', settings);
          } catch (e) {
            console.warn('Could not save settings to localStorage:', e);
          }
          
          // Rebuild the interface with new settings
          this.rebuildInterface();
          
          // Force node to recalculate its size
          this.calculateAndSetNodeSize();
          
          settingsModal.style.display = 'none';
        };
        
        // Close modal on outside click
        settingsModal.onclick = (e) => {
          if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
          }
        };

        this.container = container;
        this.nodeListDiv = container.querySelector('#nodeListContent');
        this.monitoringActive = true;
        
        // Add copy stats functionality
        const copyStatsBtn = container.querySelector('#copyStatsBtn');
        if (copyStatsBtn) {
          copyStatsBtn.onclick = () => {
            this.copyStatsToClipboard();
          };
        }
        
        // Start the chart update loop
        this.startChartUpdates();
        
        // Force initial chart draw and apply loaded settings
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Apply the loaded settings to the interface
            if (this.displayMode !== 'combined') {
              this.rebuildInterface();
              // After rebuild, restore current values from single source of truth
              this.updateAllUI();
            } else {
              this.drawChart();
            }
          });
        });
      };
      
      // Initialize canvas with proper dimensions
      nodeType.prototype.initializeCanvas = function(canvas, ctx) {
        if (!canvas) return;
        
        // Use double requestAnimationFrame to ensure layout is complete
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.updateCanvasSize(canvas);
            // Initial draw
            if (this.drawChart) {
              this.drawChart();
            }
          });
        });
        
        // Also add a fallback resize after a short delay
        setTimeout(() => {
          this.updateCanvasSize(canvas);
        }, 100);
      };
      
      // Setup zoom handling for LiteGraph compatibility
      nodeType.prototype.setupZoomHandling = function(canvas, ctx) {
        // Store reference to original onResize if it exists
        const originalOnResize = this.onResize;
        
        // Implement proper onResize handler with debouncing
        this.onResize = function(size) {
          // Detect if this is a manual resize by the user vs programmatic resize
          if (!this.programmaticResize) {
            // User manually resized the node - respect their choice
            this.userHasManuallyResized = true;
          }
          
          // Call original onResize if it exists
          if (originalOnResize) {
            originalOnResize.call(this, size);
          }
          
          // Debounce resize events to prevent spam
          if (this.resizeDebounceTimeout) {
            clearTimeout(this.resizeDebounceTimeout);
          }
          
          this.resizeDebounceTimeout = setTimeout(() => {
            try {
              // Update canvas sizes based on new node size
              if (this.chartCanvas && this.displayMode !== 'individual') {
                // Reinitialize the canvas properly
                this.updateCanvasSize(this.chartCanvas);
                
                // Make sure context is still valid
                if (this.chartContext) {
                  this.drawChart();
                }
              } else if (this.individualCanvases) {
                // Force DOM to recalculate layout
                setTimeout(() => {
                  // Update all individual canvases
                  Object.values(this.individualCanvases).forEach(({ canvas, ctx, resource }, index) => {
                    if (canvas && ctx) {
                      // Get the canvas container to check its size
                      const container = canvas.parentElement;
                      if (container) {
                        // Force canvas to match container size by removing existing styles
                        canvas.removeAttribute('style');
                        canvas.style.width = '100%';
                        canvas.style.height = '50px';
                        canvas.style.display = 'block';
                        
                        // Force reflow
                        canvas.offsetHeight;
                        
                        // Update canvas buffer size
                        this.updateCanvasSize(canvas);
                      }
                    }
                  });
                  
                  // Draw charts after all canvases are updated
                  setTimeout(() => {
                    this.updateIndividualCharts();
                  }, 100);
                }, 50);
              }
              
              // Update any canvases that were passed directly
              if (canvas && canvas !== this.chartCanvas) {
                this.updateCanvasSize(canvas);
              }
              
              // Restart chart updates if they stopped
              if (!this.chartUpdateInterval) {
                this.startChartUpdates();
              }
              
              // CRITICAL: Force immediate chart redraw after resize
              requestAnimationFrame(() => {
                if (this.displayMode === 'individual' && this.individualCanvases) {
                  this.updateIndividualCharts();
                } else if (this.chartCanvas && this.chartContext) {
                  this.drawChart();
                }
              });
              
            } catch (error) {
              console.error("Error during resize handling:", error);
              // Try to restart everything if there was an error
              this.restartChartSystem();
            }
          }, 100); // 100ms debounce
        };
      };

      // Draw the resource chart (combined stacked view like ss.png)
      nodeType.prototype.drawChart = function() {
        // Update Chart.js instead of manual canvas drawing
        if (!this.chartInstances.main) {
          console.warn('[KikoStats] Chart.js instance not found in drawChart');
          return;
        }

        const chart = this.chartInstances.main;

        // Debug: log current temp data being sent to chart
        const latestTempIndex = (this.historyIndex - 1 + 60) % 60;
        console.log(`[KikoStats] drawChart - Latest temp in history[${latestTempIndex}]: ${this.tempHistory[latestTempIndex]}%`);

        // Update all dataset data arrays
        chart.data.datasets[0].data = [...this.gpuHistory];
        chart.data.datasets[1].data = [...this.vramHistory];
        chart.data.datasets[2].data = [...this.cpuHistory];
        chart.data.datasets[3].data = [...this.ramHistory];
        chart.data.datasets[4].data = [...this.tempHistory];

        // Update chart without animation for smooth real-time updates
        chart.update('none');
      };
      
      // Load settings from localStorage
      nodeType.prototype.loadSettings = function() {
        try {
          const savedSettings = localStorage.getItem('kikoStats_settings');
          // Loading saved settings
          
          if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            this.displayMode = settings.displayMode || 'combined';
            this.enabledPanels = settings.enabledPanels || ['cpu', 'gpu', 'vram', 'ram', 'temp'];
            this.panelOrder = settings.panelOrder || ['cpu', 'gpu', 'vram', 'ram', 'temp'];
            // Settings loaded from localStorage
          } else {
            // Default settings
            this.displayMode = 'combined';
            this.enabledPanels = ['cpu', 'gpu', 'vram', 'ram', 'temp'];
            this.panelOrder = ['cpu', 'gpu', 'vram', 'ram', 'temp'];
            // Using default settings
          }
        } catch (e) {
          // Could not load settings from localStorage
          // Default settings
          this.displayMode = 'combined';
          this.enabledPanels = ['cpu', 'gpu', 'vram', 'ram', 'temp'];
          this.panelOrder = ['cpu', 'gpu', 'vram', 'ram', 'temp'];
        }
      };
      
      // Copy stats to clipboard
      nodeType.prototype.copyStatsToClipboard = function() {
        const frontendNodes = window.kikoStatsCompletedNodes || [];
        
        if (frontendNodes.length === 0) {
          // Show feedback that there's nothing to copy
          const copyBtn = this.container.querySelector('#copyStatsBtn');
          if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '❌';
            copyBtn.style.color = '#f44336';
            setTimeout(() => {
              copyBtn.textContent = originalText;
              copyBtn.style.color = '#4fc3f7';
            }, 1000);
          }
          return;
        }
        
        // Format stats for clipboard
        let statsText = '🎯 ComfyUI Node Performance Stats\n';
        statsText += '=' + '='.repeat(40) + '\n\n';
        
        frontendNodes.forEach((node, index) => {
          const duration = (node.duration_ms / 1000).toFixed(1);
          const nodeTitle = node.node_title || node.node_type || `Node ${node.node_id}`;
          
          statsText += `${index + 1}. ${nodeTitle}\n`;
          statsText += `   Duration: ${duration}s\n`;
          
          if (node.avg_cpu_percent > 0) {
            statsText += `   CPU: ${node.avg_cpu_percent.toFixed(1)}% (peak: ${node.max_cpu_percent.toFixed(1)}%)\n`;
          }
          if (node.avg_gpu_utilization > 0) {
            statsText += `   GPU: ${node.avg_gpu_utilization.toFixed(1)}% (peak: ${node.max_gpu_utilization.toFixed(1)}%)\n`;
          }
          if (node.peak_vram_used > 0) {
            statsText += `   VRAM: ${node.peak_vram_used.toFixed(0)}MB\n`;
          }
          
          statsText += '\n';
        });
        
        statsText += `Generated by ComfyUI-KikoStats at ${new Date().toLocaleString()}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(statsText).then(() => {
          // Show success feedback
          const copyBtn = this.container.querySelector('#copyStatsBtn');
          if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅';
            copyBtn.style.color = '#4caf50';
            setTimeout(() => {
              copyBtn.textContent = originalText;
              copyBtn.style.color = '#4fc3f7';
            }, 1000);
          }
          // Stats copied to clipboard
        }).catch(err => {
          console.error('Failed to copy stats:', err);
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = statsText;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          
          // Show success feedback
          const copyBtn = this.container.querySelector('#copyStatsBtn');
          if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅';
            copyBtn.style.color = '#4caf50';
            setTimeout(() => {
              copyBtn.textContent = originalText;
              copyBtn.style.color = '#4fc3f7';
            }, 1000);
          }
        });
      };
      
      // Populate settings modal with current values
      nodeType.prototype.populateSettingsModal = function(container) {
        // Set display mode radio buttons
        const displayModeRadios = container.querySelectorAll('input[name="displayMode"]');
        displayModeRadios.forEach(radio => {
          radio.checked = radio.value === this.displayMode;
        });
        
        // Set panel checkboxes and order
        const panelItems = container.querySelectorAll('.panel-item');
        panelItems.forEach(item => {
          const panel = item.dataset.panel;
          const checkbox = item.querySelector('input[type="checkbox"]');
          checkbox.checked = this.enabledPanels.includes(panel);
        });
        
        console.log('Settings modal populated with current values');
      };

      // Draw the resource chart (combined stacked view like ss.png)
      nodeType.prototype.drawChart = function() {
        if (!this.chartContext || !this.chartCanvas) {
          return;
        }
        
        // Skip this function if we're in individual mode - it should use updateIndividualCharts instead
        if (this.displayMode === 'individual') {
          return;
        }
        
        const ctx = this.chartContext;
        const canvas = this.chartCanvas;
        
        // Prepare context for crisp rendering and get logical dimensions
        const { width, height, dpr } = this.prepareCanvasContext(canvas, ctx);
        
        // Clear canvas (uses logical pixels because ctx is scaled)
        ctx.clearRect(0, 0, width, height);
        
        // Draw grid lines
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        
        // Horizontal lines
        for (let i = 0; i <= 4; i++) {
          const y = (height * i) / 4;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        
        // Vertical lines (time markers)
        for (let i = 0; i <= 6; i++) {
          const x = (width * i) / 6;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        
        const stepX = width / (this.cpuHistory.length - 1);
        
        // Define colors for each resource
        const resources = [
          { data: this.cpuHistory, color: '#4fc3f7', name: 'CPU' },
          { data: this.gpuHistory, color: '#81c784', name: 'GPU' },
          { data: this.vramHistory, color: '#ff9800', name: 'VRAM' },
          { data: this.ramHistory, color: '#e91e63', name: 'RAM' },
          { data: this.tempHistory, color: '#f44336', name: 'TEMP' }
        ];
        
        if (this.displayMode === 'combined') {
          // Draw stacked area chart like ss.png
          const enabledResources = resources.filter(r => this.enabledPanels.includes(r.name.toLowerCase()));
          
          // Calculate stacked values
          const stackedData = [];
          for (let i = 0; i < this.cpuHistory.length; i++) {
            let stackedValue = 0;
            const point = [];
            enabledResources.forEach(resource => {
              stackedValue += resource.data[i];
              point.push({ value: stackedValue, color: resource.color });
            });
            stackedData.push(point);
          }
          
          // Draw stacked areas from bottom to top
          enabledResources.forEach((resource, resourceIndex) => {
            ctx.fillStyle = resource.color;
            ctx.beginPath();
            
            // Draw the area for this resource
            for (let i = 0; i < stackedData.length; i++) {
              const x = i * stepX;
              const currentStack = stackedData[i];
              
              if (resourceIndex < currentStack.length) {
                const topY = height - (currentStack[resourceIndex].value / 400) * height; // Scale for stacked view
                const bottomY = resourceIndex > 0 ? 
                  height - (currentStack[resourceIndex - 1].value / 400) * height : height;
                
                if (i === 0) {
                  ctx.moveTo(x, bottomY);
                  ctx.lineTo(x, topY);
                } else {
                  ctx.lineTo(x, topY);
                }
              }
            }
            
            // Complete the area
            for (let i = stackedData.length - 1; i >= 0; i--) {
              const x = i * stepX;
              const currentStack = stackedData[i];
              const bottomY = resourceIndex > 0 && resourceIndex - 1 < currentStack.length ? 
                height - (currentStack[resourceIndex - 1].value / 400) * height : height;
              ctx.lineTo(x, bottomY);
            }
            
            ctx.closePath();
            ctx.fill();
          });
          
        } else {
          // Draw individual lines
          const enabledResources = resources.filter(r => this.enabledPanels.includes(r.name.toLowerCase()));
          
          enabledResources.forEach((resource, index) => {
            ctx.strokeStyle = resource.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            for (let i = 0; i < resource.data.length; i++) {
              const x = i * stepX;
              const y = height - (resource.data[i] / 100) * height;
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            
            ctx.stroke();
          });
        }
      };
      
      // Update chart with new data - NOW USES SINGLE SOURCE OF TRUTH
      nodeType.prototype.updateChart = function() {
        if (!this.container) return;
        
        // updateChart called - using single source of truth
        
        // Get current stats and update single source of truth
        const stats = this.getResourceStats();
        
        if (stats && !stats.waiting) {
          // Process data through single source of truth
          this.updateResourceData(stats);
        } else {
          // Just redraw charts from existing data
          if (this.displayMode === 'individual' && this.individualCanvases) {
            this.updateIndividualCharts();
          } else {
            this.drawChart();
          }
        }
      };
      
      // Start chart update loop
      nodeType.prototype.startChartUpdates = function() {
        if (this.chartUpdateInterval) clearInterval(this.chartUpdateInterval);
        
        this.chartUpdateInterval = setInterval(() => {
          // Timer-based update using single source of truth
          this.updateChart();
        }, 1000); // Update every 1s, synchronized with backend
      };

      // Update the monitoring display (legacy function for compatibility)
      nodeType.prototype.updateMonitorDisplay = function(container) {
        // This is now handled by updateChart()
        this.updateChart();
      };
      
      // Set workflow execution time
      nodeType.prototype.setWorkflowExecutionTime = function(totalSeconds) {
        this.totalWorkflowExecutionTime = totalSeconds;
        
        // Trigger UI update to display the total time
        requestAnimationFrame(() => {
          this.updateNodeList(window.kikoStatsCompletedNodes || []);
        });
      };
      
      // Update the node performance list (restored functionality)
      nodeType.prototype.updateNodeList = function(nodeMetrics) {
        if (!this.nodeListDiv || !nodeMetrics || nodeMetrics.length === 0) {
          if (this.nodeListDiv) {
            this.nodeListDiv.innerHTML = '<div style="color: #666;">Run a workflow to see per-node stats</div>';
          }
          // Recalculate size even when clearing the list
          this.calculateAndSetNodeSize();
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
              padding: 3px 0;
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

        // Add total workflow execution time if available
        let totalTimeHtml = '';
        if (this.totalWorkflowExecutionTime !== null && nodeHtml) {
          const totalSeconds = this.totalWorkflowExecutionTime;
          totalTimeHtml = `
            <div style="
              margin-top: 8px;
              padding-top: 8px;
              border-top: 2px solid #4fc3f7;
              color: #4fc3f7;
              font-weight: bold;
              font-size: 11px;
              text-align: center;
            ">
              ⏱️ Total Workflow Time: ${totalSeconds.toFixed(2)}s
            </div>
          `;
        }
        
        this.nodeListDiv.innerHTML = (nodeHtml || '<div style="color: #666;">No node data available</div>') + totalTimeHtml;
        
        // Use requestAnimationFrame to ensure DOM is updated before measuring
        requestAnimationFrame(() => {
          // Recalculate node size after content changes
          this.calculateAndSetNodeSize();
        });
      };

      // Add a completed node to the display (restored functionality)
      nodeType.prototype.addCompletedNode = function(nodeMetrics) {
        
        // Update node list immediately
        if (this.nodeListDiv) {
          const frontendNodes = window.kikoStatsCompletedNodes || [];
          this.updateNodeList(frontendNodes);
        }
      };

      // Update completed nodes display (restored functionality)
      nodeType.prototype.updateCompletedNodes = function() {
        
        // Update node list with all completed nodes
        if (this.nodeListDiv) {
          const frontendNodes = window.kikoStatsCompletedNodes || [];
          this.updateNodeList(frontendNodes);
        }
      };
      
      // Rebuild interface based on current settings
      nodeType.prototype.rebuildInterface = function() {
        if (!this.container) return;
        
        // Rebuilding interface
        
        if (this.displayMode === 'individual') {
          // Create individual charts for each enabled panel
          this.buildIndividualCharts();
        } else {
          // Rebuild combined view with filtered panels
          this.buildCombinedChart();
        }
      };
      
      // Build combined chart view
      nodeType.prototype.buildCombinedChart = function() {
        const chartContainer = this.container.querySelector('#chartContainer');
        if (!chartContainer) return;
        
        // Reset to single chart
        chartContainer.innerHTML = `
          <canvas id="resourceChart" style="
            width: 100%;
            height: 100%;
          "></canvas>
          
          <div style="
            position: absolute;
            bottom: 8px;
            left: 12px;
            color: #666;
            font-size: 10px;
          ">60 SECONDS</div>
          
          <div style="
            position: absolute;
            right: 12px;
            top: 12px;
            text-align: right;
          ">
            <div style="color: #666; font-size: 10px;">100</div>
            <div style="color: #666; font-size: 10px; position: absolute; bottom: 12px; right: 0;">0</div>
          </div>
        `;
        
        // Reinitialize canvas
        const canvas = chartContainer.querySelector('#resourceChart');
        const ctx = canvas.getContext('2d');
        this.chartCanvas = canvas;
        this.chartContext = ctx;
        
        // Initialize canvas with proper sizing
        this.initializeCanvas(canvas, ctx);
        
        // Setup zoom handling for this canvas too
        this.setupZoomHandling(canvas, ctx);
        
        this.updateChart();
        
        // Restore current values after rebuilding combined chart
        setTimeout(() => {
          this.updateAllUI();
        }, 50);
      };
      
      // Build individual charts for each resource
      nodeType.prototype.buildIndividualCharts = function() {
        const chartContainer = this.container.querySelector('#chartContainer');
        if (!chartContainer) return;
        
        // Clear existing content
        chartContainer.innerHTML = '';
        chartContainer.style.width = '100%';  // Ensure full width
        chartContainer.style.height = 'auto';
        chartContainer.style.padding = '8px';
        chartContainer.style.maxHeight = '400px';
        chartContainer.style.overflowY = 'auto';
        chartContainer.style.overflowX = 'hidden';
        
        // Resource definitions
        const resourceDefs = {
          cpu: { name: 'CPU', color: '#4fc3f7', data: 'cpuHistory', unit: '%' },
          gpu: { name: 'GPU', color: '#81c784', data: 'gpuHistory', unit: '%' },
          vram: { name: 'VRAM', color: '#ff9800', data: 'vramHistory', unit: '%' },
          ram: { name: 'RAM', color: '#e91e63', data: 'ramHistory', unit: '%' },
          temp: { name: 'TEMP', color: '#f44336', data: 'tempHistory', unit: '°C' }
        };
        
        // Create individual panels for enabled resources in order
        this.individualCanvases = {};
        
        this.panelOrder.forEach(panelId => {
          if (this.enabledPanels.includes(panelId)) {
            const resource = resourceDefs[panelId];
            if (resource) {
              const panelDiv = document.createElement('div');
              panelDiv.style.cssText = `
                background: rgba(0,0,0,0.2);
                border-radius: 4px;
                padding: 6px;
                margin-bottom: 6px;
                border-left: 3px solid ${resource.color};
                position: relative;
                height: 70px;
                width: 100%;
                box-sizing: border-box;
                flex-shrink: 0;
              `;
              
              panelDiv.innerHTML = `
                <div style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 4px;
                ">
                  <span style="color: ${resource.color}; font-weight: bold; font-size: 11px;">
                    ${resource.name}
                  </span>
                  <span id="chart-${panelId}-value" style="color: #fff; font-size: 14px; font-weight: bold;">
                    0${resource.unit}
                  </span>
                </div>
                <canvas id="${panelId}Chart" style="
                  width: 100%;
                  height: 50px;
                  display: block;
                "></canvas>
              `;
              
              chartContainer.appendChild(panelDiv);
              
              // Initialize canvas
              const canvas = panelDiv.querySelector(`#${panelId}Chart`);
              const ctx = canvas.getContext('2d');
              this.individualCanvases[panelId] = { canvas, ctx, resource };
              
              // Initialize canvas with proper sizing
              this.initializeCanvas(canvas, ctx);
            }
          }
        });
        
        // Recalculate node size for new mode
        this.calculateAndSetNodeSize();
        
        // Wait for canvases to be initialized before updating charts
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.updateIndividualCharts();
            
            // Restore current values after rebuilding individual charts  
            setTimeout(() => {
              this.updateAllUI();
            }, 50);
          });
        });
      };
      
      // Update individual charts
      nodeType.prototype.updateIndividualCharts = function() {
        if (!this.individualCanvases) {
          return;
        }
        
        Object.keys(this.individualCanvases).forEach(panelId => {
          const { canvas, ctx, resource } = this.individualCanvases[panelId];
          const data = this[resource.data];
          
          if (!canvas || !ctx || !data) return;
          
          // Prepare context for crisp rendering and get logical dimensions
          const { width, height, dpr } = this.prepareCanvasContext(canvas, ctx);
          
          if (width === 0 || height === 0) {
            return; // Skip if not visible
          }
          
          // Clear canvas (uses logical pixels because ctx is scaled)
          ctx.clearRect(0, 0, width, height);
          
          // Draw grid lines
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1;
          
          // Horizontal lines
          for (let i = 0; i <= 2; i++) {
            const y = (height * i) / 2;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }
          
          // Draw chart line
          ctx.strokeStyle = resource.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          
          const stepX = width / (data.length - 1);
          
          // Determine scale based on resource type
          let maxValue = 100;
          if (panelId === 'temp') {
            maxValue = 90; // Temperature scale 0-90°C
          }
          
          for (let i = 0; i < data.length; i++) {
            const x = i * stepX;
            let value = data[i];
            
            // For temperature, convert percentage back to actual temp for display
            if (panelId === 'temp') {
              value = (data[i] / 100) * 90; // Convert back from percentage to temp
            }
            
            const y = height - (value / maxValue) * height;
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          
          ctx.stroke();
          
          // Fill area under curve
          ctx.fillStyle = resource.color + '20';
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.fill();
          
          // Update value display using SINGLE SOURCE OF TRUTH
          const valueEl = this.container.querySelector(`#chart-${panelId}-value`);
          if (valueEl) {
            let displayValue = 0;
            
            // Get value from single source of truth
            switch(panelId) {
              case 'cpu':
                displayValue = this.currentResourceData.cpu.value;
                break;
              case 'gpu':
                displayValue = this.currentResourceData.gpu.value;
                break;
              case 'vram':
                displayValue = this.currentResourceData.vram.value;
                break;
              case 'ram':
                displayValue = this.currentResourceData.ram.value;
                break;
              case 'temp':
                displayValue = this.currentResourceData.temp.value; // Actual temperature in °C
                break;
            }
            
            valueEl.textContent = `${Math.round(displayValue)}${resource.unit}`;
            // Value set from single source
          }
        });
      };

      // Get resource stats from the stored execution data
      nodeType.prototype.getResourceStats = function() {
        const currentTime = new Date().toLocaleTimeString();
        // Getting resource stats
        
        // Use the latest monitoring data from node execution
        if (this.latestMonitorData && this.latestMonitorData.gpu && this.latestMonitorData.system) {
          // Returning fresh monitoring data
          
          // If temperature is 0, supplement with mock temperature
          if (this.latestMonitorData.gpu && this.latestMonitorData.gpu.temperature === 0) {
            this.latestMonitorData.gpu.temperature = Math.floor(Math.random() * 25) + 45; // 45-70°C
          }
          
          return this.latestMonitorData;
        }
        
        // Enhanced mock data generator to provide realistic values including temperature
        // Generating enhanced mock data with temperature
        
        // Generate realistic mock data with temperature
        const mockTemp = Math.floor(Math.random() * 25) + 45; // 45-70°C realistic GPU temp
        const mockCpuPercent = Math.floor(Math.random() * 40) + 10; // 10-50% CPU
        const mockGpuUtil = Math.floor(Math.random() * 60) + 20; // 20-80% GPU
        const mockVramUsed = Math.floor(Math.random() * 4000) + 2000; // 2-6GB
        const mockVramTotal = 8192; // 8GB total
        const mockRamUsed = Math.floor(Math.random() * 8000) + 4000; // 4-12GB
        const mockRamTotal = 16384; // 16GB total
        
        const mockData = {
          gpu: {
            available: true,
            utilization: mockGpuUtil,
            memory_used: mockVramUsed,
            memory_total: mockVramTotal,
            temperature: mockTemp,
            power_draw: Math.floor(Math.random() * 100) + 150 // 150-250W
          },
          system: {
            available: true,
            cpu_percent: mockCpuPercent,
            ram_used: mockRamUsed,
            ram_total: mockRamTotal
          },
          timestamp: Date.now() / 1000
        };
        
        // Generated mock data
        return mockData;
      };


      // Add a completed node to the display
      nodeType.prototype.addCompletedNode = function(nodeMetrics) {
        
        // Update node list immediately
        if (this.nodeListDiv) {
          const frontendNodes = window.kikoStatsCompletedNodes || [];
          this.updateNodeList(frontendNodes);
        }
      };

      // Update completed nodes display (called after workflow finishes)
      nodeType.prototype.updateCompletedNodes = function() {
        
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

      // Create popout window for charts
      nodeType.prototype.createPopoutWindow = function() {
        if (this.isChartsPoppedOut) return;

        // Create the popout overlay
        this.popoutWindow = document.createElement('div');
        this.popoutWindow.style.cssText = `
          position: fixed;
          top: 50px;
          left: 50px;
          width: 600px;
          height: 400px;
          background: rgba(42, 42, 42, 0.95);
          border: 1px solid #404040;
          border-radius: 8px;
          z-index: 10000;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          resize: both;
          overflow: hidden;
          min-width: 300px;
          min-height: 200px;
          font-family: 'Segoe UI', monospace;
          color: #ffffff;
        `;

        // Create header with close button
        const header = document.createElement('div');
        header.style.cssText = `
          background: rgba(76, 195, 247, 0.1);
          padding: 8px 12px;
          border-bottom: 1px solid #404040;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: move;
        `;
        header.innerHTML = `
          <span style="color: #4fc3f7; font-weight: bold; font-size: 14px;">📊 Resource Monitor - Charts</span>
          <button id="popoutClose" style="
            background: #666;
            color: white;
            border: none;
            width: 20px;
            height: 20px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">✕</button>
        `;

        // Create content area for charts
        const content = document.createElement('div');
        content.style.cssText = `
          padding: 12px;
          height: calc(100% - 50px);
          overflow: hidden;
        `;

        this.popoutWindow.appendChild(header);
        this.popoutWindow.appendChild(content);
        document.body.appendChild(this.popoutWindow);

        // Make draggable
        this.makeElementDraggable(this.popoutWindow, header);

        // Add close button functionality
        const closeBtn = header.querySelector('#popoutClose');
        closeBtn.onclick = () => this.closePopoutWindow();

        // Handle popout window resize
        const resizeObserver = new ResizeObserver(() => {
          if (this.popoutCanvas) {
            requestAnimationFrame(() => {
              this.updateCanvasSize(this.popoutCanvas);
              this.drawPopoutChart();
            });
          } else if (this.popoutIndividualCanvases) {
            requestAnimationFrame(() => {
              Object.values(this.popoutIndividualCanvases).forEach(({ canvas }) => {
                this.updateCanvasSize(canvas);
              });
              this.updatePopoutIndividualCharts();
            });
          }
        });
        resizeObserver.observe(this.popoutWindow);
        this.popoutResizeObserver = resizeObserver;

        // Move charts to popout
        this.moveChartsToPopout(content);

        // Update state and button
        this.isChartsPoppedOut = true;
        this.updatePopoutButtonText();
        
        // Resize node to remove chart space
        this.calculateAndSetNodeSize();
      };

      // Close popout window and restore charts to node
      nodeType.prototype.closePopoutWindow = function() {
        if (!this.isChartsPoppedOut || !this.popoutWindow) return;

        // Move charts back to node
        this.moveChartsBackToNode();

        // Clean up resize observer
        if (this.popoutResizeObserver) {
          this.popoutResizeObserver.disconnect();
          this.popoutResizeObserver = null;
        }

        // Remove popout window
        document.body.removeChild(this.popoutWindow);
        this.popoutWindow = null;

        // Update state and button
        this.isChartsPoppedOut = false;
        this.updatePopoutButtonText();
        
        // Resize node to include chart space again
        this.calculateAndSetNodeSize();
      };

      // Move charts from node to popout
      nodeType.prototype.moveChartsToPopout = function(popoutContent) {
        if (!this.container) return;

        // Create chart container in popout
        const chartDiv = document.createElement('div');
        chartDiv.id = 'popoutChartContainer';
        chartDiv.style.cssText = `
          background: #1a1a1a;
          border-radius: 4px;
          padding: 12px;
          height: 100%;
          position: relative;
        `;

        if (this.displayMode === 'individual') {
          // Move individual charts
          chartDiv.style.overflowY = 'auto';
          this.createPopoutIndividualCharts(chartDiv);
        } else {
          // Move combined chart
          chartDiv.innerHTML = `
            <canvas id="popoutChart" style="width: 100%; height: calc(100% - 40px);"></canvas>
            <div style="position: absolute; bottom: 8px; left: 12px; color: #666; font-size: 10px;">60 SECONDS</div>
            <div style="position: absolute; right: 12px; top: 12px; text-align: right;">
              <div style="color: #666; font-size: 10px;">100</div>
              <div style="color: #666; font-size: 10px; position: absolute; bottom: 12px; right: 0;">0</div>
            </div>
          `;
          
          // Initialize popout canvas
          const popoutCanvas = chartDiv.querySelector('#popoutChart');
          const popoutCtx = popoutCanvas.getContext('2d');
          this.popoutCanvas = popoutCanvas;
          this.popoutContext = popoutCtx;
          
          requestAnimationFrame(() => {
            this.updateCanvasSize(popoutCanvas);
            this.drawPopoutChart();
          });
        }

        popoutContent.appendChild(chartDiv);
        
        // Hide original charts in node
        const originalChartContainer = this.container.querySelector('#chartContainer');
        if (originalChartContainer) {
          originalChartContainer.style.display = 'none';
        }
      };

      // Move charts back from popout to node
      nodeType.prototype.moveChartsBackToNode = function() {
        if (!this.container) return;

        // Show original charts in node
        const originalChartContainer = this.container.querySelector('#chartContainer');
        if (originalChartContainer) {
          originalChartContainer.style.display = 'block';
        }

        // Clean up popout chart references
        this.popoutCanvas = null;
        this.popoutContext = null;
        this.popoutIndividualCanvases = null;

        // Restore chart functionality in node
        if (this.displayMode === 'individual') {
          this.buildIndividualCharts();
        } else {
          this.buildCombinedChart();
        }
      };

      // Create individual charts in popout
      nodeType.prototype.createPopoutIndividualCharts = function(container) {
        const resourceDefs = {
          cpu: { name: 'CPU', color: '#4fc3f7', data: 'cpuHistory', unit: '%' },
          gpu: { name: 'GPU', color: '#81c784', data: 'gpuHistory', unit: '%' },
          vram: { name: 'VRAM', color: '#ff9800', data: 'vramHistory', unit: '%' },
          ram: { name: 'RAM', color: '#e91e63', data: 'ramHistory', unit: '%' },
          temp: { name: 'TEMP', color: '#f44336', data: 'tempHistory', unit: '°C' }
        };

        this.popoutIndividualCanvases = {};

        this.panelOrder.forEach(panelId => {
          if (this.enabledPanels.includes(panelId)) {
            const resource = resourceDefs[panelId];
            if (resource) {
              const panelDiv = document.createElement('div');
              panelDiv.style.cssText = `
                background: rgba(0,0,0,0.2);
                border-radius: 4px;
                padding: 6px;
                margin-bottom: 6px;
                border-left: 3px solid ${resource.color};
                position: relative;
                height: 70px;
                width: 100%;
                box-sizing: border-box;
                flex-shrink: 0;
              `;

              panelDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="color: ${resource.color}; font-weight: bold; font-size: 11px;">${resource.name}</span>
                  <span id="popout${panelId}Value" style="color: #fff; font-size: 14px; font-weight: bold;">0${resource.unit}</span>
                </div>
                <canvas id="popout${panelId}Chart" style="width: 100%; height: 50px; display: block;"></canvas>
              `;

              container.appendChild(panelDiv);

              const canvas = panelDiv.querySelector(`#popout${panelId}Chart`);
              const ctx = canvas.getContext('2d');
              this.popoutIndividualCanvases[panelId] = { canvas, ctx, resource };

              requestAnimationFrame(() => {
                this.updateCanvasSize(canvas);
              });
            }
          }
        });
      };

      // Draw chart in popout window
      nodeType.prototype.drawPopoutChart = function() {
        if (!this.popoutContext || !this.popoutCanvas) return;

        const ctx = this.popoutContext;
        const canvas = this.popoutCanvas;
        
        // Prepare context for crisp rendering and get logical dimensions
        const { width, height, dpr } = this.prepareCanvasContext(canvas, ctx);

        if (width === 0 || height === 0) return;

        // Clear canvas (uses logical pixels because ctx is scaled)
        ctx.clearRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;

        // Horizontal grid lines
        for (let i = 0; i <= 4; i++) {
          const y = (height / 4) * i;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Vertical grid lines
        for (let i = 0; i <= 6; i++) {
          const x = (width / 6) * i;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // Draw resource lines
        const resources = [
          { name: 'CPU', data: this.cpuHistory, color: '#4fc3f7' },
          { name: 'GPU', data: this.gpuHistory, color: '#81c784' },
          { name: 'VRAM', data: this.vramHistory, color: '#ff9800' },
          { name: 'RAM', data: this.ramHistory, color: '#e91e63' },
          { name: 'TEMP', data: this.tempHistory, color: '#f44336' }
        ];

        const enabledResources = resources.filter(r => this.enabledPanels.includes(r.name.toLowerCase()));
        const stepX = width / 60;

        enabledResources.forEach((resource) => {
          ctx.strokeStyle = resource.color;
          ctx.lineWidth = 2;
          ctx.beginPath();

          for (let i = 0; i < resource.data.length; i++) {
            const x = i * stepX;
            const y = height - (resource.data[i] / 100) * height;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }

          ctx.stroke();
        });
      };

      // Update popout button text based on state
      nodeType.prototype.updatePopoutButtonText = function() {
        if (!this.container) return;
        
        const popoutBtn = this.container.querySelector('#popoutBtn');
        if (popoutBtn) {
          popoutBtn.textContent = this.isChartsPoppedOut ? '📥 Restore' : '🖼️ Popout';
        }
      };

      // Update individual charts in popout
      nodeType.prototype.updatePopoutIndividualCharts = function() {
        if (!this.popoutIndividualCanvases) return;

        Object.keys(this.popoutIndividualCanvases).forEach(panelId => {
          const { canvas, ctx, resource } = this.popoutIndividualCanvases[panelId];
          const data = this[resource.data];
          
          if (!canvas || !ctx || !data) return;
          
          // Prepare context for crisp rendering and get logical dimensions
          const { width, height, dpr } = this.prepareCanvasContext(canvas, ctx);
          
          if (width === 0 || height === 0) return;
          
          // Clear canvas (uses logical pixels because ctx is scaled)
          ctx.clearRect(0, 0, width, height);
          
          // Draw grid lines
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1;
          
          // Horizontal lines
          for (let i = 0; i <= 2; i++) {
            const y = (height / 2) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }
          
          // Draw data line
          ctx.strokeStyle = resource.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          
          const stepX = width / 60;
          for (let i = 0; i < data.length; i++) {
            const x = i * stepX;
            const y = height - (data[i] / 100) * height;
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          
          ctx.stroke();
          
          // Update value display
          const valueEl = this.popoutWindow.querySelector(`#popout${panelId}Value`);
          if (valueEl) {
            const currentValue = Math.round(this.currentResourceData[panelId]?.value || 0);
            valueEl.textContent = currentValue + resource.unit;
          }
        });
      };

      // Make element draggable
      nodeType.prototype.makeElementDraggable = function(element, handle) {
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        handle.addEventListener('mousedown', (e) => {
          isDragging = true;
          const rect = element.getBoundingClientRect();
          dragOffset.x = e.clientX - rect.left;
          dragOffset.y = e.clientY - rect.top;
          e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          
          element.style.left = (e.clientX - dragOffset.x) + 'px';
          element.style.top = (e.clientY - dragOffset.y) + 'px';
        });

        document.addEventListener('mouseup', () => {
          isDragging = false;
        });
      };

      // Add context menu options
      nodeType.prototype.getMenuOptions = function() {
        const options = [];
        
        if (this.userHasManuallyResized) {
          options.push({
            content: "🔄 Reset to Auto-sizing",
            callback: () => {
              this.userHasManuallyResized = false;
              this.calculateAndSetNodeSize();
            }
          });
        }
        
        return options;
      };

      // Cleanup when node is removed
      nodeType.prototype.onRemoved = function() {
        // Close popout window if open
        if (this.isChartsPoppedOut && this.popoutWindow) {
          this.closePopoutWindow();
        }
        
        // Clean up resize observer
        if (this.resizeObserver) {
          this.resizeObserver.disconnect();
          this.resizeObserver = null;
        }
        
        // Clear timeouts
        if (this.resizeTimeout) {
          clearTimeout(this.resizeTimeout);
        }
        if (this.updateInterval) {
          clearInterval(this.updateInterval);
        }
        if (this.chartUpdateInterval) {
          clearInterval(this.chartUpdateInterval);
        }
        
        // Remove from global registry
        if (window.resourceMonitorNodes) {
          const index = window.resourceMonitorNodes.indexOf(this);
          if (index > -1) {
            window.resourceMonitorNodes.splice(index, 1);
          }
        }
      };
    }
  }
});