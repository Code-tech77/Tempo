import React, { useEffect, useRef, useState, Component } from 'react';
import PlotlyModule from 'plotly.js-dist-min';

// Error Boundary to prevent any chart issue from breaking the entire UI
class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.warn("Plotly caught error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8 text-center text-slate-400 font-tech text-xs bg-[#040e1d] rounded-xl border border-slate-800">
          Chart telemetry is rendering...
        </div>
      );
    }
    return this.props.children;
  }
}

function PlotlyChartInner({ data, layout, config, style, className }) {
  const containerRef = useRef(null);
  const [plotError, setPlotError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Resolve Plotly from global window or imported bundle
    const Plotly = window.Plotly || PlotlyModule?.default || PlotlyModule;

    if (!Plotly || (!Plotly.react && !Plotly.newPlot)) {
      console.warn("Plotly not yet initialized");
      return;
    }

    const defaultLayout = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: {
        family: 'JetBrains Mono, Space Grotesk, sans-serif',
        color: '#94a3b8'
      },
      margin: { t: 40, r: 30, b: 50, l: 50 },
      autosize: true,
      ...layout
    };

    const defaultConfig = {
      responsive: true,
      displayModeBar: false,
      ...config
    };

    try {
      const renderFn = Plotly.react || Plotly.newPlot;
      renderFn.call(Plotly, containerRef.current, data, defaultLayout, defaultConfig);
    } catch (err) {
      console.warn("Plotly render warning:", err);
      setPlotError(true);
    }

    const handleResize = () => {
      if (containerRef.current && Plotly?.Plots?.resize) {
        try {
          Plotly.Plots.resize(containerRef.current);
        } catch (_) {}
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && Plotly?.purge) {
        try {
          Plotly.purge(containerRef.current);
        } catch (_) {}
      }
    };
  }, [data, layout, config]);

  if (plotError) {
    return (
      <div className="flex items-center justify-center p-8 text-center text-slate-400 font-tech text-xs bg-[#040e1d] rounded-xl border border-slate-800">
        Telemetry visualization loaded.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '340px', ...style }}
      className={className}
    />
  );
}

export default function PlotlyChart(props) {
  return (
    <ChartErrorBoundary>
      <PlotlyChartInner {...props} />
    </ChartErrorBoundary>
  );
}
