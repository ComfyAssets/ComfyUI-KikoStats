# ComfyUI-KikoStats

Real-time GPU and system resource monitoring for ComfyUI with **per-node performance tracking**.

## ✨ Features

- 📊 **Real-time Resource Monitoring**

  - GPU utilization, VRAM usage, temperature, and power draw
  - CPU usage and RAM statistics
  - Updates every second via WebSocket

- 🎯 **Per-Node Performance Tracking** (Unique Feature!)

  - Track CPU and GPU usage for each individual node
  - Measure execution time per node
  - Identify workflow bottlenecks
  - See which nodes consume the most resources

- 🎨 **Clean, Integrated UI**

  - Embedded monitoring display in the node
  - Expandable node performance list
  - Real-time updates without workflow execution
  - Professional dark theme design

- 🚀 **Minimal Performance Impact**
  - Thread-safe background monitoring (<0.5% CPU)
  - No impact on ComfyUI execution
  - Smart resource sampling

## Installation

### Method 1: Clone into ComfyUI custom nodes directory

```bash
cd ComfyUI/custom_nodes/
git clone https://github.com/ComfyAssets/ComfyUI-KikoStats.git
cd ComfyUI-KikoStats
pip install -r requirements.txt
```

### Method 2: Manual installation

1. Download/copy the `ComfyUI-KikoStats` folder to your `ComfyUI/custom_nodes/` directory
2. Install dependencies:
   ```bash
   pip install nvidia-ml-py psutil
   ```

### Method 3: ComfyUI Manager

_Coming soon - will be available through ComfyUI Manager_

## Usage

1. **Restart ComfyUI** after installation
2. In ComfyUI, add a new node and search for "Resource Monitor"
3. Find it under the **ComfyAssets** category
4. Click **"Start Monitoring"** button to see real-time stats
5. Run any workflow to see per-node performance data

### Understanding the Display

**Real-time Stats:**

```
🖥️ GPU: 45%
VRAM: 1024MB / 24576MB
Temp: 37°C

💻 CPU: 12.5%
RAM: 3831MB / 64197MB
```

**Per-Node Performance (after workflow execution):**

```
📊 Node Performance
KSampler: 12.8% CPU, 87.3% GPU
          (15.7s)
VAE Decode: 15.2% CPU, 45.8% GPU
          (2.3s)
Load Checkpoint: 8.2% CPU, 12.1% GPU
          (1.2s)
```

## Troubleshooting

### Node doesn't appear in ComfyUI

1. **Restart ComfyUI completely** (most common fix)
2. Check ComfyUI console for error messages during startup
3. Verify the folder is in the correct location: `ComfyUI/custom_nodes/ComfyUI-KikoStats/`
4. Check that dependencies are installed: `pip install nvidia-ml-py psutil`

### GPU monitoring shows "Not Available"

- Requires NVIDIA GPU with drivers installed
- Install nvidia-ml-py: `pip install nvidia-ml-py`
- Check that NVIDIA drivers are working: `nvidia-smi`

### System monitoring shows "Not Available"

- Install psutil: `pip install psutil`

## Node Reference

### ResourceMonitor

**Category**: ComfyAssets  
**Inputs**:

- `update_interval` (FLOAT): Monitoring refresh rate in seconds (0.1-60.0)
- `display_mode` (CHOICE): Output format - "text", "json", or "both"
- `enable_gpu` (BOOLEAN): Enable GPU monitoring (optional)
- `enable_system` (BOOLEAN): Enable system monitoring (optional)

**Outputs**:

- `stats` (STRING): Formatted monitoring statistics
- `json_data` (STRING): JSON data for chaining to other nodes

## Requirements

- **Core**: Python 3.7+
- **GPU Monitoring**: nvidia-ml-py (for NVIDIA GPUs)
- **System Monitoring**: psutil
- **ComfyUI**: Compatible with recent versions

## Performance

- **CPU Overhead**: <0.5% typical usage
- **Memory**: Minimal impact with circular buffers
- **Thread Safety**: Background monitoring doesn't block ComfyUI execution

## What Makes KikoStats Different?

| Feature               | KikoStats | Crystools | Elegant Monitor |
| --------------------- | --------- | --------- | --------------- |
| Real-time monitoring  | ✅        | ✅        | ✅              |
| **Per-node tracking** | ✅        | ❌        | ❌              |
| GPU stats             | ✅        | ✅        | ✅              |
| CPU/RAM stats         | ✅        | ✅        | ✅              |
| Embedded UI           | ✅        | ❌        | ✅              |
| WebSocket updates     | ✅        | ✅        | ❌              |
| Execution timing      | ✅        | ❌        | ❌              |

## Development

## License

MIT License - see [LICENSE](LICENSE) file for details.
