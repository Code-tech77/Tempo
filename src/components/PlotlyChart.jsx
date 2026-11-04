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
        <div className="chart-message" role="status">
          This chart could not be displayed.
        </div>
      );
    }
    return this.props.children;
  }
}

function PlotlyChartInner({ data, layout, config, style, className, ariaLabel = 'Data chart' }) {
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
        family: 'IBM Plex Sans, sans-serif',
        color: '#565b72'
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
        } catch {}
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && Plotly?.purge) {
        try {
          Plotly.purge(containerRef.current);
        } catch {}
      }
    };
  }, [data, layout, config]);

  if (plotError) {
    return (
      <div className="chart-message" role="status">
        This chart could not be displayed.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '340px', ...style }}
      className={className}
      role="img"
      aria-label={ariaLabel}
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
