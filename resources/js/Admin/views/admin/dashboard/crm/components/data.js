import user1 from "@admin/assets/images/users/user-1.jpg";
import user10 from "@admin/assets/images/users/user-10.jpg";
import user2 from "@admin/assets/images/users/user-2.jpg";
import user3 from "@admin/assets/images/users/user-3.jpg";
import user4 from "@admin/assets/images/users/user-4.jpg";
import user5 from "@admin/assets/images/users/user-5.jpg";
import user6 from "@admin/assets/images/users/user-6.jpg";
import user7 from "@admin/assets/images/users/user-7.jpg";
import user8 from "@admin/assets/images/users/user-8.jpg";
import user9 from "@admin/assets/images/users/user-9.jpg";
import { getColor } from "@admin/utils/helpers";
import flagau from "@admin/assets/images/flags/au.svg";
import flagin from "@admin/assets/images/flags/in.svg";
import flagus from "@admin/assets/images/flags/us.svg";
export const crmStatData = [{
  title: "Leads Generated",
  value: 48.2,
  suffix: "k",
  icon: "users",
  change: 5.12,
  label: "2.3k Up",
  chartOptions: () => ({
    chart: {
      type: "area",
      height: 50,
      sparkline: {
        enabled: true
      }
    },
    series: [{
      name: "Leads",
      data: [25, 28, 32, 38, 43, 55, 60, 48, 42, 51, 35]
    }],
    stroke: {
      width: 2,
      curve: "smooth"
    },
    markers: {
      size: 0
    },
    colors: [getColor("chart-primary")],
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
            return "Leads";
          }
        }
      },
      marker: {
        show: false
      }
    },
    fill: {
      opacity: [1],
      type: ["gradient"],
      gradient: {
        type: "vertical",
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0,
        stops: [0, 100]
      }
    }
  })
}, {
  title: "Qualified Leads",
  value: 12.8,
  suffix: "k",
  icon: "user-check",
  change: -3.45,
  label: "0.4k Down",
  chartOptions: () => ({
    series: [70],
    chart: {
      type: "radialBar",
      height: 90,
      width: 90
    },
    stroke: {
      lineCap: "round"
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: "45%"
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
    labels: ["Direct"],
    colors: [getColor("chart-primary")]
  })
}, {
  title: "Deals Closed",
  value: 9.75,
  suffix: "k",
  icon: "briefcase",
  change: 2.94,
  label: "1.1k Up",
  chartOptions: () => ({
    chart: {
      type: "area",
      height: 50,
      sparkline: {
        enabled: true
      }
    },
    series: [{
      name: "Deals",
      data: [32, 45, 38, 52, 47, 66, 70, 64, 78, 72, 81]
    }],
    stroke: {
      width: 2,
      curve: "smooth"
    },
    markers: {
      size: 0
    },
    colors: [getColor("chart-primary"), getColor("chart-gamma"), getColor("chart-gray")],
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
            return "Leads";
          }
        }
      },
      marker: {
        show: false
      }
    },
    fill: {
      opacity: [1],
      type: ["gradient"],
      gradient: {
        type: "vertical",
        //   shadeIntensity: 1,
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0,
        stops: [0, 100]
      }
    }
  })
}, {
  title: "Revenue Generated",
  value: 5.63,
  prefix: "$",
  suffix: "M",
  icon: "dollar",
  change: 4.21,
  label: "$32.4k Up",
  chartOptions: () => ({
    series: [70],
    chart: {
      type: "radialBar",
      height: 90,
      width: 90
    },
    stroke: {
      lineCap: "round"
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: "45%"
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
    labels: ["Direct"],
    colors: [getColor("chart-primary")]
  })
}];
export const overviewData = [{
  title: "Revenue",
  value: 56.63,
  prefix: "$",
  suffix: "k",
  icon: "cash",
  className: "text-success me-1",
  change: -3.91
}, {
  title: "Orders",
  value: 9842,
  icon: "truck",
  className: "text-info me-1",
  change: 8.72
}, {
  title: "New Users",
  value: 95.3,
  suffix: "k",
  icon: "users-group",
  className: "me-1",
  change: 11.2
}, {
  title: "New Contract",
  value: 851,
  icon: "heart-handshake",
  className: "me-1",
  change: 0.0
}];
export const dealData = [{
  id: "#DH874",
  name: "AdamM09",
  className: "bg-primary-subtle text-primary",
  company: "Rex Audio",
  progress: 3,
  date: "20 Apr, 2024",
  user: {
    name: "Alexa Newsome",
    image: user1
  },
  value: 100.1,
  prefix: "$",
  suffix: "K",
  status: "paused"
}, {
  id: "#DH809",
  name: "Sensor Lecto",
  className: "bg-success-subtle text-success",
  company: "Morville",
  progress: 2,
  date: "31 Dec, 2024",
  user: {
    name: "David Lee",
    image: user2
  },
  value: 95,
  prefix: "$",
  suffix: "K",
  status: "new"
}, {
  id: "#DH807",
  name: "Dhvanil",
  className: "bg-info-subtle text-info",
  company: "Olson's Market",
  progress: 4,
  date: "05 Jun, 2024",
  user: {
    name: "Peter Hein",
    image: user5
  },
  value: 65.95,
  prefix: "$",
  suffix: "K",
  status: "cold-lead"
}, {
  id: "#DH805",
  name: "KHCoal",
  className: "bg-secondary-subtle text-secondary",
  company: "Erlebacher's",
  progress: 1,
  date: "25 Aug, 2024",
  user: {
    name: "Gladys Rivas",
    image: user7
  },
  value: 296.1,
  prefix: "$",
  suffix: "K",
  status: "canceled"
}, {
  id: "#DH800",
  name: "Haniyo",
  className: "bg-warning-subtle text-warning",
  company: "Colonial Stores",
  progress: 5,
  date: "30 Sep, 2024",
  user: {
    name: "Joan Wisdom",
    image: user10
  },
  value: 25.9,
  prefix: "$",
  suffix: "K",
  status: "deal-won"
}, {
  id: "#DH798",
  name: "Lunotech",
  className: "bg-primary-subtle text-primary",
  company: "Northbridge Ltd",
  progress: 2,
  date: "12 Jan, 2025",
  user: {
    name: "Chris Nolan",
    image: user3
  },
  value: 78.3,
  prefix: "$",
  suffix: "K",
  status: "paused"
}, {
  id: "#DH792",
  name: "TechHive",
  className: "bg-success-subtle text-success",
  company: "Urban Labs",
  progress: 3,
  date: "08 Mar, 2025",
  user: {
    name: "Karen Miles",
    image: user4
  },
  value: 120.4,
  prefix: "$",
  suffix: "K",
  status: "new"
}, {
  id: "#DH788",
  name: "PixelForge",
  className: "bg-warning-subtle text-warning",
  company: "Bright Mart",
  progress: 1,
  date: "15 Jul, 2025",
  user: {
    name: "Oscar Brent",
    image: user6
  },
  value: 58.7,
  prefix: "$",
  suffix: "K",
  status: "cold-lead"
}, {
  id: "#DH780",
  name: "RedCore",
  className: "bg-danger-subtle text-danger",
  company: "Highland Co.",
  progress: 1,
  date: "21 Feb, 2025",
  user: {
    name: "Maria Jensen",
    image: user8
  },
  value: 42.3,
  prefix: "$",
  suffix: "K",
  status: "canceled"
}, {
  id: "#DH776",
  name: "BluEdge",
  className: "bg-success-subtle text-success",
  company: "Arcton Energy",
  progress: 5,
  date: "10 Oct, 2024",
  user: {
    name: "Daniel Cook",
    image: user9
  },
  value: 310.2,
  prefix: "$",
  suffix: "K",
  status: "deal-won"
}, {
  id: "#DH770",
  name: "CloudNova",
  className: "bg-info-subtle text-info",
  company: "Prime Retail",
  progress: 1,
  date: "28 May, 2025",
  user: {
    name: "Emily Grace",
    image: user5
  },
  value: 54.1,
  prefix: "$",
  suffix: "K",
  status: "paused"
}, {
  id: "#DH765",
  name: "Finexa",
  className: "bg-danger-subtle text-danger",
  company: "Beacon Stores",
  progress: 1,
  date: "02 Feb, 2025",
  user: {
    name: "Nathan Cole",
    image: user7
  },
  value: 19.8,
  prefix: "$",
  suffix: "K",
  status: "canceled"
}];
export const saleExecutiveData = [{
  user: {
    name: "Jeremy Young",
    designation: "Senior Sales Executive"
  },
  leads: 187,
  deals: 154,
  tasks: 49
}, {
  user: {
    name: "Thomas Krueger",
    designation: "Senior Sales Executive"
  },
  leads: 235,
  deals: 127,
  tasks: 83
}, {
  user: {
    name: "Pete Burdine",
    designation: "Senior Sales Executive"
  },
  leads: 365,
  deals: 148,
  tasks: 62
}, {
  user: {
    name: "Mary Nelson",
    designation: "Senior Sales Executive"
  },
  leads: 753,
  deals: 159,
  tasks: 258
}, {
  user: {
    name: "Kevin Grove",
    designation: "Senior Sales Executive"
  },
  leads: 458,
  deals: 126,
  tasks: 73
}];
export const countryData = [{
  country: {
    name: "United States",
    image: flagus
  },
  sessions: 196584,
  users: 187232,
  percentage: "48.63%"
}, {
  country: {
    name: "India",
    image: flagin
  },
  sessions: 145845,
  users: 126874,
  percentage: "36.08%"
}, {
  country: {
    name: "Australia",
    image: flagau
  },
  sessions: 95845,
  users: 90127,
  percentage: "23.41%"
}];
export const activityData = [{
  title: "15 New Leads Added",
  description: "Fresh inbound leads were captured from the website and synced automatically.",
  author: "Olivia Carter",
  icon: "user-plus",
  className: "text-bg-primary"
}, {
  title: "Lead Follow-Up Emails Sent",
  description: "Follow-up messages were sent to all leads who have not responded within 48 hours.",
  author: "Daniel Moore",
  icon: "messages",
  className: "text-bg-success"
}, {
  title: "Sales Calls Logged",
  description: "20 outbound calls were recorded for prospects in the “Negotiation” stage.",
  author: "Sophia Turner",
  icon: "phone-call",
  className: "text-bg-warning"
}, {
  title: "Team Member Assigned to Deals",
  description: "Three deals were reassigned to the senior sales team for faster conversion.",
  author: "Liam Anderson",
  icon: "users",
  className: "text-bg-info"
}, {
  title: "Deals Moved to Lost Stage",
  description: "4 deals were marked as “Lost” due to inactivity or declined proposals.",
  author: "Ethan Brooks",
  icon: "close",
  className: "text-bg-danger"
}, {
  title: "Two Deals Successfully Closed",
  description: "Two high-value deals were marked “Won” and moved to the onboarding pipeline.",
  author: "Ava Mitchell",
  icon: "briefcase",
  className: "text-bg-secondary"
}];