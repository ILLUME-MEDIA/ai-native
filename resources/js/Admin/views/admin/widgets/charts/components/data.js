import { getColor } from '@admin/utils/helpers';
export const statData = [{
  title: 'Leads Generated',
  value: 48.2,
  suffix: 'k',
  icon: 'users',
  change: 5.12,
  label: '2.3k Up',
  chartOptions: () => ({
    chart: {
      type: 'area',
      height: 50,
      sparkline: {
        enabled: true
      }
    },
    series: [{
      name: 'Leads',
      data: [25, 28, 32, 38, 43, 55, 60, 48, 42, 51, 35]
    }],
    stroke: {
      width: 2,
      curve: 'smooth'
    },
    markers: {
      size: 0
    },
    colors: [getColor('chart-primary')],
    tooltip: {
      fixed: {
        enabled: false
      },
      x: {
        show: false
      },
      y: {
        title: {
          formatter: function () {
            return 'Leads';
          }
        }
      },
      marker: {
        show: false
      }
    },
    fill: {
      opacity: [1],
      type: ['gradient'],
      gradient: {
        type: 'vertical',
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0,
        stops: [0, 100]
      }
    }
  })
}, {
  title: 'Qualified Leads',
  value: 12.8,
  suffix: 'k',
  icon: 'user-check',
  change: -3.45,
  label: '0.4k Down',
  chartOptions: () => ({
    chart: {
      type: 'radialBar',
      height: 90,
      width: 90
    },
    stroke: {
      lineCap: 'round'
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: '45%'
        },
        dataLabels: {
          show: false
        }
      }
    },
    grid: {
      padding: {
        top: -20,
        bottom: -20,
        left: -20,
        right: -20
      }
    },
    series: [70],
    labels: ['Direct'],
    colors: [getColor('chart-primary')]
  })
}, {
  title: 'Deals Closed',
  value: 9.75,
  suffix: 'k',
  icon: 'briefcase',
  change: 2.94,
  label: '1.1k Up',
  chartOptions: () => ({
    chart: {
      type: 'area',
      height: 50,
      sparkline: {
        enabled: true
      }
    },
    series: [{
      name: 'Deals',
      data: [32, 45, 38, 52, 47, 66, 70, 64, 78, 72, 81]
    }],
    stroke: {
      width: 2,
      curve: 'smooth'
    },
    markers: {
      size: 0
    },
    colors: [getColor('chart-primary'), getColor('chart-gamma'), getColor('chart-gray')],
    tooltip: {
      fixed: {
        enabled: false
      },
      x: {
        show: false
      },
      y: {
        title: {
          formatter: function () {
            return 'Leads';
          }
        }
      },
      marker: {
        show: false
      }
    },
    fill: {
      opacity: [1],
      type: ['gradient'],
      gradient: {
        type: 'vertical',
        //   shadeIntensity: 1,
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0,
        stops: [0, 100]
      }
    }
  })
}, {
  title: 'Revenue Generated',
  value: 5.63,
  prefix: '$',
  suffix: 'M',
  icon: 'currency-dollar',
  change: 4.21,
  label: '$32.4k Up',
  chartOptions: () => ({
    chart: {
      type: 'bar',
      height: 60,
      sparkline: {
        enabled: true
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 4
      }
    },
    colors: [getColor('chart-primary')],
    series: [{
      name: 'Revenue',
      data: [47, 45, 74, 14, 56, 74, 14, 11, 7, 39, 82]
    }],
    xaxis: {
      crosshairs: {
        width: 1
      }
    },
    tooltip: {
      fixed: {
        enabled: false
      },
      x: {
        show: false
      },
      y: {
        formatter: value => {
          return '$' + value;
        },
        title: {
          formatter: function () {
            return 'Revenue';
          }
        }
      },
      marker: {
        show: false
      }
    }
  })
}];
function generateRandomData(length = 12, min = 10, max = 100) {
  const data = [];
  for (let i = 0; i < length; i++) {
    data.push(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return data;
}
const revenueData = generateRandomData(12);
const expensesData = generateRandomData(12);
const profitData = generateRandomData(12);
const cashflowData = generateRandomData(12);
export const revenueStatisticData = [{
  title: 'Total Revenue',
  value: 1240,
  prefix: '$',
  suffix: 'k',
  label: 'This Quarter',
  change: '8.2%',
  className: 'bg-success-subtle text-success',
  chartOptions: () => ({
    chart: {
      type: 'bar',
      height: 60,
      sparkline: {
        enabled: true
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 4
      }
    },
    colors: [getColor('chart-primary')],
    series: [{
      name: 'Revenue',
      data: revenueData
    }],
    tooltip: {
      x: {
        show: false
      },
      y: {
        formatter: value => '$' + value
      }
    }
  })
}, {
  title: 'Total Expenses',
  value: 840,
  prefix: '$',
  suffix: 'k',
  label: 'This Quarter',
  change: '-2.1%',
  className: 'bg-danger-subtle text-danger',
  chartOptions: () => ({
    chart: {
      type: 'line',
      height: 60,
      sparkline: {
        enabled: true
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 4
      }
    },
    stroke: {
      width: 2,
      curve: 'smooth'
    },
    colors: [getColor('chart-beta')],
    series: [{
      name: 'Expenses',
      data: expensesData
    }],
    tooltip: {
      x: {
        show: false
      },
      y: {
        formatter: value => '$' + value
      }
    }
  })
}, {
  title: 'Net Profit',
  value: 400,
  prefix: '$',
  suffix: 'k',
  label: 'This Quarter',
  change: 'Stable',
  className: 'bg-info-subtle text-info',
  chartOptions: () => ({
    chart: {
      type: 'bar',
      height: 60,
      sparkline: {
        enabled: true
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 4
      }
    },
    colors: [getColor('chart-secondary')],
    series: [{
      name: 'Net Profit',
      data: profitData
    }],
    tooltip: {
      x: {
        show: false
      },
      y: {
        formatter: value => '$' + value
      }
    }
  })
}, {
  title: 'Cash Flow',
  value: 720,
  prefix: '$',
  suffix: 'k',
  label: 'This Quarter',
  change: '5.6%',
  className: 'bg-warning-subtle text-warning',
  chartOptions: () => ({
    chart: {
      type: 'area',
      height: 60,
      sparkline: {
        enabled: true
      }
    },
    colors: [getColor('chart-gamma')],
    series: [{
      name: 'Cash Flow',
      data: cashflowData
    }],
    stroke: {
      width: 2,
      curve: 'smooth'
    },
    tooltip: {
      x: {
        show: false
      },
      y: {
        formatter: value => '$' + value
      }
    }
  })
}];
export const performanceData = [{
  title: 'Number of Projects',
  value: 7845
}, {
  title: 'Active Projects',
  value: 289
}, {
  title: 'Revenue',
  value: 982.5,
  prefix: '$',
  suffix: 'k'
}, {
  title: 'Working Hours',
  value: 12559,
  prefix: '~',
  suffix: 'h'
}];
export const insightData = [{
  pageLink: '/paces/dashboard-analytics',
  views: 25,
  rate: 87.5
}, {
  pageLink: '/paces/dashboard-crm',
  views: 15,
  rate: 21.48
}, {
  pageLink: '/paces/dashboard',
  views: 10,
  rate: 63.59
}];
export const salesReportData = [{
  title: 'Revenue',
  value: 78224.68,
  icon: 'wallet',
  prefix: '$'
}, {
  title: 'Orders',
  value: 8541,
  icon: 'basket'
}, {
  title: 'Growth Rate',
  value: 25.3,
  icon: 'trending-up',
  suffix: '%'
}];
export const overviewData = [{
  title: 'Revenue',
  icon: 'tabler:square-rounded-arrow-down',
  value: 29.56,
  prefix: '$',
  suffix: 'k',
  className: 'text-success'
}, {
  title: 'Expenses',
  icon: 'tabler:square-rounded-arrow-up',
  value: 15.08,
  prefix: '$',
  suffix: 'k',
  className: 'text-danger'
}, {
  title: 'Investment',
  icon: 'tabler:chart-infographic',
  value: 3.67,
  prefix: '$',
  suffix: 'k'
}, {
  title: 'Savings',
  icon: 'tabler:pig',
  value: 6.72,
  prefix: '$',
  suffix: 'k'
}];