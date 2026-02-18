export const menuItems = [{
  icon: "dashboard",
  slug: "main",
  label: "Main",
  isTitle: true,
  children: [{
    icon: "dashboard",
    slug: "dashboards",
    label: "Dashboards",
    children: [{
      url: "/dashboard/ecommerce",
      slug: "pages:dashboard-ecommerce",
      label: "Ecommerce"
    }]
  }]
}, {
  icon: "apps",
  slug: "apps",
  label: "Apps",
  isTitle: true,
  children: [{
    slug: "ecommerce",
    label: "Ecommerce",
    children: [{
      url: "/apps/sections",
      slug: "pages:apps-sections-list",
      label: "Section Builder"
    }, {
      slug: "products",
      label: "Products",
      children: [{
        url: "/apps/ecommerce/products",
        slug: "pages:apps-ecommerce-products",
        label: "Products"
      }, {
        url: "/apps/ecommerce/products-grid",
        slug: "pages:apps-ecommerce-products-grid",
        label: "Products Grid"
      }, {
        url: "/apps/ecommerce/product-details",
        slug: "pages:apps-ecommerce-product-details",
        label: "Product Details"
      }, {
        url: "/apps/ecommerce/product-add",
        slug: "pages:apps-ecommerce-product-add",
        label: "Add Product"
      }]
    }, {
      url: "/apps/ecommerce/categories",
      slug: "pages:apps-ecommerce-categories",
      label: "Categories"
    }, {
      slug: "orders",
      label: "Orders",
      children: [{
        url: "/apps/ecommerce/orders",
        slug: "pages:apps-ecommerce-orders",
        label: "Orders"
      }, {
        url: "/apps/ecommerce/order-details",
        slug: "pages:apps-ecommerce-order-details",
        label: "Order Details"
      }, {
        url: "/apps/ecommerce/order-add",
        slug: "pages:apps-ecommerce-order-add",
        label: "Add/Edit Order"
      }]
    }, {
      url: "/apps/ecommerce/customers",
      slug: "pages:apps-ecommerce-customers",
      label: "Customers"
    }, {
      url: "/apps/ecommerce/cart",
      slug: "pages:apps-ecommerce-cart",
      label: "Cart"
    }, {
      url: "/apps/ecommerce/checkout",
      slug: "pages:apps-ecommerce-checkout",
      label: "Checkout"
    }, {
      slug: "sellers",
      label: "Sellers",
      children: [{
        url: "/apps/ecommerce/sellers",
        slug: "pages:apps-ecommerce-sellers",
        label: "Sellers"
      }, {
        url: "/apps/ecommerce/seller-details",
        slug: "pages:apps-ecommerce-seller-details",
        label: "Sellers Details"
      }]
    }, {
      url: "/apps/ecommerce/refunds",
      slug: "pages:apps-ecommerce-refunds",
      label: "Refunds"
    }, {
      url: "/apps/ecommerce/reviews",
      slug: "pages:apps-ecommerce-reviews",
      label: "Reviews"
    }, {
      slug: "inventory",
      label: "Inventory",
      children: [{
        url: "/apps/ecommerce/warehouse",
        slug: "pages:apps-ecommerce-warehouse",
        label: "Warehouse"
      }, {
        url: "/apps/ecommerce/product-stocks",
        slug: "pages:apps-ecommerce-product-stocks",
        label: "Product Stocks"
      }, {
        url: "/apps/ecommerce/purchased-orders",
        slug: "pages:apps-ecommerce-purchased-orders",
        label: "Purchased Orders"
      }]
    }, {
      slug: "reports",
      label: "Reports",
      children: [{
        url: "/apps/ecommerce/product-views",
        slug: "pages:apps-ecommerce-product-views",
        label: "Product Views"
      }, {
        url: "/apps/ecommerce/sales",
        slug: "pages:apps-ecommerce-sales",
        label: "Sales"
      }]
    }, {
      url: "/apps/ecommerce/attributes",
      slug: "pages:apps-ecommerce-attributes",
      label: "Attributes"
    }, {
      url: "/apps/ecommerce/settings",
      slug: "pages:apps-ecommerce-settings",
      label: "Settings"
    }]
  }, {
    url: "/apps/chat",
    icon: "message",
    slug: "pages:apps-chat",
    label: "Chat"
  }, {
    icon: "briefcase",
    slug: "projects",
    label: "Projects",
    children: [{
      url: "/apps/projects/grid",
      slug: "pages:apps-projects-grid",
      label: "My Projects"
    }, {
      url: "/apps/projects/list",
      slug: "pages:apps-projects-list",
      label: "Projects List"
    }, {
      url: "/apps/projects/details",
      slug: "pages:apps-projects-details",
      label: "View Project"
    }, {
      url: "/apps/projects/kanban",
      slug: "pages:apps-projects-kanban",
      label: "Kanban Board"
    }, {
      url: "/apps/projects/team-board",
      slug: "pages:apps-projects-team-board",
      label: "Team Board"
    }, {
      url: "/apps/projects/activity",
      slug: "pages:apps-projects-activity",
      label: "Activity Steam"
    }]
  }, {
    icon: "list-check",
    slug: "tasks",
    label: "Tasks",
    children: [{
      url: "/apps/task/list",
      slug: "pages:apps-task-list",
      label: "Task List"
    }, {
      url: "/apps/task/details",
      slug: "pages:apps-task-details",
      label: "Task Details"
    }, {
      url: "/apps/task/create",
      slug: "pages:apps-task-create",
      label: "Create Task"
    }]
  }, {
    icon: "invoice",
    slug: "invoice",
    label: "Invoice",
    children: [{
      url: "/apps/invoice/list",
      slug: "pages:apps-invoice-list",
      label: "Invoices"
    }, {
      url: "/apps/invoice/details",
      slug: "pages:apps-invoice-details",
      label: "Single Invoice"
    }, {
      url: "/apps/invoice/create",
      slug: "pages:apps-invoice-create",
      label: "New Invoice"
    }]
  }, {
    icon: "heart-handshake",
    slug: "crm",
    label: "CRM",
    children: [{
      url: "/apps/crm/contacts",
      slug: "pages:apps-crm-contacts",
      label: "Contacts"
    }, {
      url: "/apps/crm/opportunities",
      slug: "pages:apps-crm-opportunities",
      label: "Opportunities"
    }, {
      url: "/apps/crm/deals",
      slug: "pages:apps-crm-deals",
      label: "Deals"
    }, {
      url: "/apps/crm/leads",
      slug: "pages:apps-crm-leads",
      label: "Leads"
    }, {
      url: "/apps/crm/pipeline",
      slug: "pages:apps-crm-pipeline",
      label: "Pipeline"
    }, {
      url: "/apps/crm/campaign",
      slug: "pages:apps-crm-campaign",
      label: "Campaign"
    }, {
      url: "/apps/crm/proposals",
      slug: "pages:apps-crm-proposals",
      label: "Proposals"
    }, {
      url: "/apps/crm/estimations",
      slug: "pages:apps-crm-estimations",
      label: "Estimations"
    }, {
      url: "/apps/crm/customers",
      slug: "pages:apps-crm-customers",
      label: "Customers"
    }, {
      url: "/apps/crm/activities",
      slug: "pages:apps-crm-activities",
      label: "Activities"
    }]
  }, {
    icon: "users",
    slug: "users",
    label: "Users",
    children: [{
      url: "/apps/users/contacts",
      slug: "pages:apps-users-contacts",
      label: "Contacts"
    }, {
      url: "/apps/users/profile",
      slug: "pages:apps-users-profile",
      label: "Profile"
    }, {
      url: "/apps/users/account-settings",
      slug: "pages:apps-users-account-settings",
      label: "Account Settings"
    }, {
      url: "/apps/users/roles",
      slug: "pages:apps-users-roles",
      label: "Roles"
    }, {
      url: "/apps/users/role-details",
      slug: "pages:apps-users-role-details",
      label: "Role Details"
    }, {
      url: "/apps/users/permissions",
      slug: "pages:apps-users-permissions",
      label: "Permissions"
    }]
  }, {
    icon: "wallet",
    slug: "finance",
    label: "Finance",
    children: [{
      slug: "expenses",
      label: "Expenses",
      children: [{
        url: "/apps/finance/expenses",
        slug: "pages:apps-finance-expenses",
        label: "Expenses"
      }, {
        url: "/apps/finance/expense-category",
        slug: "pages:apps-finance-expense-category",
        label: "Expense Category"
      }]
    }, {
      url: "/apps/finance/income",
      slug: "pages:apps-finance-income",
      label: "Income"
    }, {
      url: "/apps/finance/transactions",
      slug: "pages:apps-finance-transactions",
      label: "Transactions"
    }, {
      url: "/apps/finance/banks-cards",
      slug: "pages:apps-finance-banks-cards",
      label: "Banks & Cards"
    }]
  }, {
    icon: "accessible",
    slug: "hrm",
    label: "HRM",
    children: [{
      slug: "staffs",
      label: "Staffs",
      children: [{
        url: "/apps/hrm/staffs",
        slug: "pages:apps-hrm-staffs",
        label: "Staffs List"
      }, {
        url: "/apps/hrm/staff-profile",
        slug: "pages:apps-hrm-staff-profile",
        label: "Staff Profile"
      }, {
        url: "/apps/hrm/staff-add",
        slug: "pages:apps-hrm-staff-add",
        label: "Add Staffs"
      }]
    }, {
      url: "/apps/hrm/departments",
      slug: "pages:apps-hrm-departments",
      label: "Departments"
    }, {
      url: "/apps/hrm/attendance",
      slug: "pages:apps-hrm-attendance",
      label: "Attendance"
    }, {
      slug: "leaves",
      label: "Leaves",
      children: [{
        url: "/apps/hrm/leaves",
        slug: "pages:apps-hrm-leaves",
        label: "Leaves"
      }, {
        url: "/apps/hrm/leave-add",
        slug: "pages:apps-hrm-leave-add",
        label: "Add Leave"
      }]
    }, {
      url: "/apps/hrm/holidays",
      slug: "pages:apps-hrm-holidays",
      label: "Holidays"
    }, {
      url: "/apps/hrm/payroll",
      slug: "pages:apps-hrm-payroll",
      label: "Payroll"
    }, {
      url: "/apps/hrm/create-salary-slip",
      slug: "pages:apps-hrm-create-salary-slip",
      label: "Create Salary Slip"
    }]
  }, {
    icon: "mailbox",
    slug: "email",
    badge: {
      text: "New",
      variant: "bg-danger"
    },
    label: "Email",
    children: [{
      url: "/apps/email/inbox",
      slug: "pages:apps-email-inbox",
      label: "Inbox"
    }, {
      url: "/apps/email/details",
      slug: "pages:apps-email-details",
      label: "Details"
    }, {
      url: "/apps/email/compose",
      slug: "pages:apps-email-compose",
      label: "Compose"
    }]
  }, {
    icon: "headset",
    slug: "support-center",
    label: "Support Center",
    children: [{
      url: "/apps/ticket/list",
      slug: "pages:apps-ticket-list",
      label: "Ticket List"
    }, {
      url: "/apps/ticket/details",
      slug: "pages:apps-ticket-details",
      label: "Ticket Details"
    }, {
      url: "/apps/ticket/create",
      slug: "pages:apps-ticket-create",
      label: "New Ticket"
    }]
  }, {
    icon: "discount",
    slug: "promo",
    label: "Promo",
    children: [{
      url: "/apps/promo/coupons",
      slug: "pages:apps-promo-coupons",
      label: "Coupons"
    }, {
      url: "/apps/promo/gift-cards",
      slug: "pages:apps-promo-gift-cards",
      label: "Gift Cards"
    }, {
      url: "/apps/promo/discounts",
      slug: "pages:apps-promo-discounts",
      label: "Discounts"
    }]
  }, {
    icon: "apps",
    slug: "more-apps",
    label: "More Apps",
    children: [{
      url: "/apps/social-feed",
      slug: "pages:apps-social-feed",
      label: "Social Feed"
    }, {
      url: "/apps/pro-ai",
      slug: "pages:apps-pro-ai",
      label: "Pro AI"
    }, {
      url: "/apps/file-manager",
      slug: "pages:apps-file-manager",
      label: "File Manager"
    }, {
      url: "/apps/calendar",
      slug: "pages:apps-calendar",
      label: "Calendar"
    }, {
      url: "/apps/companies",
      slug: "pages:apps-companies",
      label: "Companies"
    }, {
      url: "/apps/todo",
      slug: "pages:apps-todo",
      label: "Todo"
    }, {
      url: "/apps/pin-board",
      slug: "pages:apps-pin-board",
      label: "Pin Board"
    }, {
      url: "/apps/clients",
      slug: "pages:apps-clients",
      label: "Clients"
    }, {
      url: "/apps/outlook",
      slug: "pages:apps-outlook",
      label: "Outlook View"
    }, {
      url: "/apps/vote-list",
      slug: "pages:apps-vote-list",
      label: "Vote List"
    }, {
      url: "/apps/issue-tracker",
      slug: "pages:apps-issue-tracker",
      label: "Issue Tracker"
    }, {
      url: "/apps/api-keys",
      slug: "pages:apps-api-keys",
      label: "API Keys"
    }, {
      url: "/apps/manage",
      slug: "pages:apps-manage",
      label: "Manage Apps"
    }, {
      slug: "blog",
      label: "Blog",
      children: [{
        url: "/apps/blog/list",
        slug: "pages:apps-blog-list",
        label: "Blog List"
      }, {
        url: "/apps/blog/grid",
        slug: "pages:apps-blog-grid",
        label: "Blog Grid"
      }, {
        url: "/apps/blog/article",
        slug: "pages:apps-blog-article",
        label: "Article"
      }, {
        url: "/apps/blog/add",
        slug: "pages:apps-blog-add",
        label: "Add Article"
      }]
    }, {
      slug: "forum",
      label: "Forum",
      children: [{
        url: "/apps/forum/view",
        slug: "pages:apps-forum-view",
        label: "Forum View"
      }, {
        url: "/apps/forum/post",
        slug: "pages:apps-forum-post",
        label: "Forum Post"
      }]
    }]
  }]
}, {
  slug: "ai-agents-system",
  label: "AI Agents",
  isTitle: true,
  children: [ {
    url: "/apps/code-editor",
    icon: "code",
    slug: "pages:apps-code-editor",
    label: "Code Editor"
  },{
    icon: "server",
    url: "/ai/endpoints",
    slug: "pages:ai-endpoints",
    label: "Manage Endpoints"
  }, {
    icon: "message-circle",
    url: "/ai/chat",
    slug: "pages:ai-chat",
    label: "AI Chat"
  }, {
    icon: "clock",
    url: "/ai/duties",
    slug: "pages:ai-duties",
    label: "Automated Duties"
  }, {
    icon: "video",
    url: "/ai/scrapers",
    slug: "pages:ai-scrapers",
    label: "YouTube Scrapers"
  }, {
    icon: "star",
    url: "/apps/yelp",
    slug: "pages:yelp",
    label: "Yelp Integration"
  }, {
    icon: "mail-check",
    url: "/apps/otp-auth",
    slug: "pages:otp-auth",
    label: "OTP Auth"
  }, {
    icon: "sparkles",
    url: "/ai/skills",
    slug: "pages:ai-skills",
    label: "Dynamic Skills"
  }, {
    icon: "file-text",
    url: "/ai/rules",
    slug: "pages:ai-rules",
    label: "Behavioral Rules"
  }, {
    icon: "settings",
    url: "/ai/jira-config",
    slug: "pages:ai-jira",
    label: "Jira Integration"
  }, {
    icon: "database",
    url: "/ai/platforms",
    slug: "pages:ai-platforms",
    label: "Platform Credentials"
  }]
}, {
  icon: "files",
  slug: "custom-pages",
  label: "Custom Pages",
  isTitle: true,
  children: [{
    icon: "files",
    slug: "pages",
    label: "Pages",
    children: [{
      url: "/pages/about-us",
      slug: "pages:pages-about-us",
      label: "About Us"
    }, {
      url: "/pages/contact-us",
      slug: "pages:pages-contact-us",
      label: "Contact Us"
    }, {
      url: "/pages/pricing",
      slug: "pages:pages-pricing",
      label: "Pricing"
    }, {
      url: "/pages/empty",
      slug: "pages:pages-empty",
      label: "Empty Page"
    }, {
      url: "/pages/timeline",
      slug: "pages:pages-timeline",
      label: "Timeline"
    }, {
      url: "/pages/gallery",
      slug: "pages:pages-gallery",
      label: "Gallery"
    }, {
      url: "/pages/faq",
      slug: "pages:pages-faq",
      label: "FAQ"
    }, {
      url: "/pages/sitemap",
      slug: "pages:pages-sitemap",
      label: "Sitemap"
    }, {
      url: "/pages/search-results",
      slug: "pages:pages-search-results",
      label: "Search Results"
    }, {
      url: "/pages/coming-soon",
      slug: "pages:pages-coming-soon",
      label: "Coming Soon"
    }, {
      url: "/pages/privacy-policy",
      slug: "pages:pages-privacy-policy",
      label: "Privacy Policy"
    }, {
      url: "/pages/terms-conditions",
      slug: "pages:pages-terms-conditions",
      label: "Terms & Conditions"
    }]
  }, {
    icon: "cpu",
    slug: "plugins",
    label: "Plugins",
    children: [{
      url: "/plugins/pdf-viewer",
      slug: "pages:plugins-pdf-viewer",
      label: "PDF Viewer"
    }, {
      url: "/plugins/sweet-alerts",
      slug: "pages:plugins-sweet-alerts",
      label: "Sweet Alerts"
    }, {
      url: "/plugins/idle-timer",
      slug: "pages:plugins-idle-timer",
      label: "Idle Timer"
    }, {
      url: "/plugins/pass-meter",
      slug: "pages:plugins-pass-meter",
      label: "Password Meter"
    }, {
      url: "/plugins/clipboard",
      slug: "pages:plugins-clipboard",
      label: "Clipboard"
    }, {
      url: "/plugins/tree-view",
      slug: "pages:plugins-tree-view",
      label: "Tree View"
    }, {
      url: "/plugins/masonry",
      slug: "pages:plugins-masonry",
      label: "Masonry"
    }, {
      url: "/plugins/tour",
      slug: "pages:plugins-tour",
      label: "Tour"
    }, {
      url: "/plugins/animation",
      slug: "pages:plugins-animation",
      label: "Animation"
    }, {
      url: "/plugins/video-player",
      slug: "pages:plugins-video-player",
      label: "Video Player"
    }]
  }, {
    icon: "password-user",
    slug: "authentication",
    label: "Authentication",
    children: [{
      slug: "auth-basic",
      label: "Basic",
      children: [{
        url: "/auth/sign-in",
        slug: "pages:auth-sign-in",
        label: "Sign In"
      }, {
        url: "/auth/sign-up",
        slug: "pages:auth-sign-up",
        label: "Sign Up"
      }, {
        url: "/auth/reset-pass",
        slug: "pages:auth-reset-pass",
        label: "Reset Password"
      }, {
        url: "/auth/new-pass",
        slug: "pages:auth-new-pass",
        label: "New Password"
      }, {
        url: "/auth/two-factor",
        slug: "pages:auth-two-factor",
        label: "Two Factor"
      }, {
        url: "/auth/lock-screen",
        slug: "pages:auth-lock-screen",
        label: "Lock Screen"
      }, {
        url: "/auth/success-mail",
        slug: "pages:auth-success-mail",
        label: "Success Mail"
      }, {
        url: "/auth/login-pin",
        slug: "pages:auth-login-pin",
        label: "Login with PIN"
      }, {
        url: "/auth/delete-account",
        slug: "pages:auth-delete-account",
        label: "Delete Account"
      }]
    }, {
      slug: "auth-card",
      label: "Card",
      children: [{
        url: "/auth/card/sign-in",
        slug: "pages:auth-card-sign-in",
        label: "Sign In"
      }, {
        url: "/auth/card/sign-up",
        slug: "pages:auth-card-sign-up",
        label: "Sign Up"
      }, {
        url: "/auth/card/reset-pass",
        slug: "pages:auth-card-reset-pass",
        label: "Reset Password"
      }, {
        url: "/auth/card/new-pass",
        slug: "pages:auth-card-new-pass",
        label: "New Password"
      }, {
        url: "/auth/card/two-factor",
        slug: "pages:auth-card-two-factor",
        label: "Two Factor"
      }, {
        url: "/auth/card/lock-screen",
        slug: "pages:auth-card-lock-screen",
        label: "Lock Screen"
      }, {
        url: "/auth/card/success-mail",
        slug: "pages:auth-card-success-mail",
        label: "Success Mail"
      }, {
        url: "/auth/card/login-pin",
        slug: "pages:auth-card-login-pin",
        label: "Login with PIN"
      }, {
        url: "/auth/card/delete-account",
        slug: "pages:auth-card-delete-account",
        label: "Delete Account"
      }]
    }, {
      slug: "auth-split",
      label: "Split",
      children: [{
        url: "/auth/split/sign-in",
        slug: "pages:auth-split-sign-in",
        label: "Sign In"
      }, {
        url: "/auth/split/sign-up",
        slug: "pages:auth-split-sign-up",
        label: "Sign Up"
      }, {
        url: "/auth/split/reset-pass",
        slug: "pages:auth-split-reset-pass",
        label: "Reset Password"
      }, {
        url: "/auth/split/new-pass",
        slug: "pages:auth-split-new-pass",
        label: "New Password"
      }, {
        url: "/auth/split/two-factor",
        slug: "pages:auth-split-two-factor",
        label: "Two Factor"
      }, {
        url: "/auth/split/lock-screen",
        slug: "pages:auth-split-lock-screen",
        label: "Lock Screen"
      }, {
        url: "/auth/split/success-mail",
        slug: "pages:auth-split-success-mail",
        label: "Success Mail"
      }, {
        url: "/auth/split/login-pin",
        slug: "pages:auth-split-login-pin",
        label: "Login with PIN"
      }, {
        url: "/auth/split/delete-account",
        slug: "pages:auth-split-delete-account",
        label: "Delete Account"
      }]
    }]
  }, {
    icon: "alert-triangle",
    slug: "error-pages",
    label: "Error Pages",
    children: [{
      url: "/error/400",
      slug: "pages:error-400",
      label: "400 Bad Request"
    }, {
      url: "/error/401",
      slug: "pages:error-401",
      label: "401 Unauthorized"
    }, {
      url: "/error/403",
      slug: "pages:error-403",
      label: "403 Forbidden"
    }, {
      url: "/error/404",
      slug: "pages:error-404",
      label: "404 Not Found"
    }, {
      url: "/error/408",
      slug: "pages:error-408",
      label: "408 Request Timeout"
    }, {
      url: "/error/500",
      slug: "pages:error-500",
      label: "500 Internal Server"
    }, {
      url: "/error/maintenance",
      slug: "pages:error-maintenance",
      label: "Maintenance"
    }]
  }]
}, {
  icon: "table-column",
  slug: "layouts",
  label: "Layouts",
  isTitle: true,
  children: [{
    icon: "layout",
    slug: "layout-options",
    label: "Layout Options",
    children: [{
      url: "/layouts/horizontal",
      slug: "pages:layouts-horizontal",
      label: "Horizontal",
      target: "_blank"
    }, {
      url: "/layouts/boxed",
      slug: "pages:layouts-boxed",
      label: "Boxed",
      target: "_blank"
    }, {
      url: "/layouts/scrollable",
      slug: "pages:layouts-scrollable",
      label: "Scrollable",
      target: "_blank"
    }, {
      url: "/layouts/compact",
      slug: "pages:layouts-compact",
      label: "Compact",
      target: "_blank"
    }, {
      url: "/layouts/preloader",
      slug: "pages:layouts-preloader",
      label: "Preloader",
      target: "_blank"
    }]
  }, {
    icon: "layout-sidebar-inactive",
    slug: "sidebars",
    label: "Sidebars",
    children: [{
      url: "/layouts/sidebar-light",
      slug: "pages:layouts-sidebar-light",
      label: "Light Menu",
      target: "_blank"
    }, {
      url: "/layouts/sidebar-gradient",
      slug: "pages:layouts-sidebar-gradient",
      label: "Gradient Menu",
      target: "_blank"
    }, {
      url: "/layouts/sidebar-gray",
      slug: "pages:layouts-sidebar-gray",
      label: "Gray Menu",
      target: "_blank"
    }, {
      url: "/layouts/sidebar-image",
      slug: "pages:layouts-sidebar-image",
      label: "Image Menu",
      target: "_blank"
    }, {
      url: "/layouts/sidebar-compact",
      slug: "pages:layouts-sidebar-compact",
      label: "Compact Menu",
      target: "_blank"
    }, {
      url: "/layouts/sidebar-on-hover",
      slug: "pages:layouts-sidebar-on-hover",
      label: "On Hover Menu",
      target: "_blank"
    }, {
      url: "/layouts/sidebar-offcanvas",
      slug: "pages:layouts-sidebar-offcanvas",
      label: "Offcanvas Menu",
      target: "_blank"
    }, {
      url: "/layouts/sidebar-no-icons",
      slug: "pages:layouts-sidebar-no-icons",
      label: "No Icons with Lines",
      target: "_blank"
    }, {
      url: "/layouts/sidebar-with-lines",
      slug: "pages:layouts-sidebar-with-lines",
      label: "Sidebar with Lines",
      target: "_blank"
    }]
  }, {
    icon: "layout-bottombar",
    slug: "topbar",
    label: "Topbar",
    children: [{
      url: "/layouts/topbar-dark",
      slug: "pages:layouts-topbar-dark",
      label: "Dark Topbar",
      target: "_blank"
    }, {
      url: "/layouts/topbar-gray",
      slug: "pages:layouts-topbar-gray",
      label: "Gray Topbar",
      target: "_blank"
    }, {
      url: "/layouts/topbar-gradient",
      slug: "pages:layouts-topbar-gradient",
      label: "Gradient Topbar",
      target: "_blank"
    }]
  }]
}, {
  icon: "components",
  slug: "components",
  label: "Components",
  isTitle: true,
  children: [{
    icon: "components",
    slug: "base-ui",
    label: "Base UI",
    children: [{
      url: "/ui/accordions",
      slug: "pages:ui-accordions",
      label: "Accordions"
    }, {
      url: "/ui/alerts",
      slug: "pages:ui-alerts",
      label: "Alerts"
    }, {
      url: "/ui/buttons",
      slug: "pages:ui-buttons",
      label: "Buttons"
    }, {
      url: "/ui/badges",
      slug: "pages:ui-badges",
      label: "Badges"
    }, {
      url: "/ui/colors",
      slug: "pages:ui-colors",
      label: "Colors"
    }, {
      url: "/ui/breadcrumb",
      slug: "pages:ui-breadcrumb",
      label: "Breadcrumb"
    }, {
      url: "/ui/cards",
      slug: "pages:ui-cards",
      label: "Cards"
    }, {
      url: "/ui/carousel",
      slug: "pages:ui-carousel",
      label: "Carousel"
    }, {
      url: "/ui/collapse",
      slug: "pages:ui-collapse",
      label: "Collapse"
    }, {
      url: "/ui/images",
      slug: "pages:ui-images",
      label: "Images"
    }, {
      url: "/ui/dropdowns",
      slug: "pages:ui-dropdowns",
      label: "Dropdowns"
    }, {
      url: "/ui/videos",
      slug: "pages:ui-videos",
      label: "Videos"
    }, {
      url: "/ui/grid",
      slug: "pages:ui-grid",
      label: "Grid Options"
    }, {
      url: "/ui/links",
      slug: "pages:ui-links",
      label: "Links"
    }, {
      url: "/ui/list-group",
      slug: "pages:ui-list-group",
      label: "List Group"
    }, {
      url: "/ui/modals",
      slug: "pages:ui-modals",
      label: "Modals"
    }, {
      url: "/ui/notifications",
      slug: "pages:ui-notifications",
      label: "Notifications"
    }, {
      url: "/ui/offcanvas",
      slug: "pages:ui-offcanvas",
      label: "Offcanvas"
    }, {
      url: "/ui/placeholders",
      slug: "pages:ui-placeholders",
      label: "Placeholders"
    }, {
      url: "/ui/pagination",
      slug: "pages:ui-pagination",
      label: "Pagination"
    }, {
      url: "/ui/popovers",
      slug: "pages:ui-popovers",
      label: "Popovers"
    }, {
      url: "/ui/progress",
      slug: "pages:ui-progress",
      label: "Progress"
    }, {
      url: "/ui/spinners",
      slug: "pages:ui-spinners",
      label: "Spinners"
    }, {
      url: "/ui/tabs",
      slug: "pages:ui-tabs",
      label: "Tabs"
    }, {
      url: "/ui/tooltips",
      slug: "pages:ui-tooltips",
      label: "Tooltips"
    }, {
      url: "/ui/typography",
      slug: "pages:ui-typography",
      label: "Typography"
    }, {
      url: "/ui/utilities",
      slug: "pages:ui-utilities",
      label: "Utilities"
    }]
  }, {
    icon: "category",
    slug: "widgets",
    label: "Widgets",
    children: [{
      url: "/widgets/charts",
      slug: "pages:widgets-charts",
      label: "Charts"
    }, {
      url: "/widgets/mixed",
      slug: "pages:widgets-mixed",
      label: "Mixed"
    }, {
      url: "/widgets/social",
      slug: "pages:widgets-social",
      label: "Social"
    }, {
      url: "/widgets/statistics",
      slug: "pages:widgets-statistics",
      label: "Statistics"
    }, {
      url: "/widgets/weather",
      slug: "pages:widgets-weather",
      label: "Weather"
    }]
  }, {
    icon: "chart-donut",
    slug: "charts",
    label: "Charts",
    children: [{
      slug: "apex-charts",
      label: "Apex Charts",
      children: [{
        url: "/charts/apex/area",
        slug: "pages:charts-apex-area",
        label: "Area"
      }, {
        url: "/charts/apex/bar",
        slug: "pages:charts-apex-bar",
        label: "Bar"
      }, {
        url: "/charts/apex/bubble",
        slug: "pages:charts-apex-bubble",
        label: "Bubble"
      }, {
        url: "/charts/apex/candlestick",
        slug: "pages:charts-apex-candlestick",
        label: "Candlestick"
      }, {
        url: "/charts/apex/column",
        slug: "pages:charts-apex-column",
        label: "Column"
      }, {
        url: "/charts/apex/heatmap",
        slug: "pages:charts-apex-heatmap",
        label: "Heatmap"
      }, {
        url: "/charts/apex/line",
        slug: "pages:charts-apex-line",
        label: "Line"
      }, {
        url: "/charts/apex/mixed",
        slug: "pages:charts-apex-mixed",
        label: "Mixed"
      }, {
        url: "/charts/apex/timeline",
        slug: "pages:charts-apex-timeline",
        label: "Timeline"
      }, {
        url: "/charts/apex/boxplot",
        slug: "pages:charts-apex-boxplot",
        label: "Boxplot"
      }, {
        url: "/charts/apex/treemap",
        slug: "pages:charts-apex-treemap",
        label: "Treemap"
      }, {
        url: "/charts/apex/pie",
        slug: "pages:charts-apex-pie",
        label: "Pie"
      }, {
        url: "/charts/apex/radar",
        slug: "pages:charts-apex-radar",
        label: "Radar"
      }, {
        url: "/charts/apex/radialbar",
        slug: "pages:charts-apex-radialbar",
        label: "RadialBar"
      }, {
        url: "/charts/apex/scatter",
        slug: "pages:charts-apex-scatter",
        label: "Scatter"
      }, {
        url: "/charts/apex/polar-area",
        slug: "pages:charts-apex-polar-area",
        label: "Polar Area"
      }, {
        url: "/charts/apex/sparklines",
        slug: "pages:charts-apex-sparklines",
        label: "Sparklines"
      }, {
        url: "/charts/apex/range",
        slug: "pages:charts-apex-range",
        label: "Range"
      }, {
        url: "/charts/apex/funnel",
        slug: "pages:charts-apex-funnel",
        label: "Funnel"
      }, {
        url: "/charts/apex/slope",
        slug: "pages:charts-apex-slope",
        label: "Slope"
      }]
    }, {
      slug: "echarts",
      label: "Echarts",
      children: [{
        url: "/charts/echart/line",
        slug: "pages:charts-echart-line",
        label: "Line"
      }, {
        url: "/charts/echart/bar",
        slug: "pages:charts-echart-bar",
        label: "Bar"
      }, {
        url: "/charts/echart/pie",
        slug: "pages:charts-echart-pie",
        label: "Pie"
      }, {
        url: "/charts/echart/scatter",
        slug: "pages:charts-echart-scatter",
        label: "Scatter"
      }, {
        url: "/charts/echart/geo-map",
        slug: "pages:charts-echart-geo-map",
        label: "GEO Map"
      }, {
        url: "/charts/echart/gauge",
        slug: "pages:charts-echart-gauge",
        label: "Gauge"
      }, {
        url: "/charts/echart/candlestick",
        slug: "pages:charts-echart-candlestick",
        label: "Candlestick"
      }, {
        url: "/charts/echart/area",
        slug: "pages:charts-echart-area",
        label: "Area"
      }, {
        url: "/charts/echart/radar",
        slug: "pages:charts-echart-radar",
        label: "Radar"
      }, {
        url: "/charts/echart/heatmap",
        slug: "pages:charts-echart-heatmap",
        label: "Heatmap"
      }, {
        url: "/charts/echart/other",
        slug: "pages:charts-echart-other",
        label: "Other"
      }]
    }, {
      slug: "chartjs",
      label: "Chart Js",
      children: [{
        url: "/charts/chartjs/area",
        slug: "pages:charts-chartjs-area",
        label: "Area"
      }, {
        url: "/charts/chartjs/bar",
        slug: "pages:charts-chartjs-bar",
        label: "Bar"
      }, {
        url: "/charts/chartjs/line",
        slug: "pages:charts-chartjs-line",
        label: "Line"
      }, {
        url: "/charts/chartjs/other",
        slug: "pages:charts-chartjs-other",
        label: "Other"
      }]
    }]
  }, {
    icon: "clipboard-list",
    slug: "forms",
    label: "Forms",
    children: [{
      url: "/form/elements",
      slug: "pages:form-elements",
      label: "Basic Elements"
    }, {
      url: "/form/validation",
      slug: "pages:form-validation",
      label: "Validation"
    }, {
      url: "/form/wizard",
      slug: "pages:form-wizard",
      label: "Wizard"
    }, {
      url: "/form/select",
      slug: "pages:form-select",
      label: "Select"
    }, {
      url: "/form/pickers",
      slug: "pages:form-pickers",
      label: "Pickers"
    }, {
      url: "/form/fileuploads",
      slug: "pages:form-fileuploads",
      label: "File Uploads"
    }, {
      url: "/form/text-editors",
      slug: "pages:form-text-editors",
      label: "Text Editors"
    }, {
      url: "/form/range-slider",
      slug: "pages:form-range-slider",
      label: "Range Slider"
    }, {
      url: "/form/cropper",
      slug: "pages:form-cropper",
      label: "Image Cropper"
    }, {
      url: "/form/layout",
      slug: "pages:form-layout",
      label: "Layouts"
    }, {
      url: "/form/other-plugin",
      slug: "pages:form-other-plugin",
      label: "Other Plugins"
    }]
  }, {
    icon: "table-column",
    slug: "tables",
    label: "Tables",
    children: [{
      url: "/tables/static",
      slug: "pages:tables-static",
      label: "Static Tables"
    }, {
      url: "/tables/custom",
      slug: "pages:tables-custom",
      label: "Custom Tables"
    }, {
      slug: "datatables",
      badge: {
        text: "15",
        variant: "success"
      },
      label: "DataTables",
      children: [{
        url: "/tables/datatables/basic",
        slug: "pages:tables-datatables-basic",
        label: "Basic"
      }, {
        url: "/tables/datatables/select",
        slug: "pages:tables-datatables-select",
        label: "Select"
      }, {
        url: "/tables/datatables/ajax",
        slug: "pages:tables-datatables-ajax",
        label: "Ajax"
      }, {
        url: "/tables/datatables/javascript",
        slug: "pages:tables-datatables-javascript",
        label: "Javascript Source"
      }, {
        url: "/tables/datatables/rendering",
        slug: "pages:tables-datatables-rendering",
        label: "Data Rendering"
      }, {
        url: "/tables/datatables/scroll",
        slug: "pages:tables-datatables-scroll",
        label: "Scroll"
      }, {
        url: "/tables/datatables/fixed-header",
        slug: "pages:tables-datatables-fixed-header",
        label: "Fixed Header"
      }, {
        url: "/tables/datatables/columns",
        slug: "pages:tables-datatables-columns",
        label: "Show & Hide Column"
      }, {
        url: "/tables/datatables/child-rows",
        slug: "pages:tables-datatables-child-rows",
        label: "Child Rows"
      }, {
        url: "/tables/datatables/column-searching",
        slug: "pages:tables-datatables-column-searching",
        label: "Column Searching"
      }, {
        url: "/tables/datatables/range-search",
        slug: "pages:tables-datatables-range-search",
        label: "Range Search"
      }, {
        url: "/tables/datatables/rows-add",
        slug: "pages:tables-datatables-rows-add",
        label: "Add Rows"
      }]
    }]
  }, {
    icon: "icons",
    slug: "icons",
    label: "Icons",
    children: [{
      url: "/icons/tabler",
      slug: "pages:icons-tabler",
      label: "Tabler"
    }, {
      url: "/icons/lucide",
      slug: "pages:icons-lucide",
      label: "Lucide"
    }, {
      url: "/icons/remix",
      slug: "pages:icons-remix",
      label: "Remix"
    }, {
      url: "/icons/solar-duotone",
      slug: "pages:icons-solar-duotone",
      label: "Solar Duotone"
    }, {
      url: "/icons/flags",
      slug: "pages:icons-flags",
      label: "Flags"
    }]
  }, {
    icon: "map",
    slug: "maps",
    label: "Maps",
    children: [{
      url: "/maps/google",
      slug: "pages:maps-google",
      label: "Google Maps"
    }, {
      url: "/maps/vector",
      slug: "pages:maps-vector",
      label: "Vector Maps"
    }, {
      url: "/maps/leaflet",
      slug: "pages:maps-leaflet",
      label: "Leaflet Maps"
    }]
  }]
}, {
  icon: "sitemap",
  slug: "menu-items",
  label: "Menu Items",
  isTitle: true,
  children: [{
    icon: "sitemap",
    slug: "menu-levels",
    label: "Menu Levels",
    children: [{
      slug: "second-level",
      label: "Second Level",
      children: [{
        slug: "menu-item-1",
        label: "Item 2.1"
      }, {
        slug: "menu-item-2",
        label: "Item 2.2"
      }]
    }, {
      slug: "second-level-2",
      label: "Second Level",
      children: [{
        slug: "menu-item-3",
        label: "Item 2.1"
      }, {
        slug: "menu-item-4",
        label: "Item 2.2",
        children: [{
          slug: "menu-item-5",
          label: "Item 3.1"
        }, {
          slug: "menu-item-6",
          label: "Item 3.2"
        }]
      }]
    }]
  }, {
    icon: "ban",
    slug: "disabled-menu",
    label: "Disabled Menu",
    isDisabled: true
  }, {
    icon: "star",
    slug: "special-menu",
    label: "Special Menu",
    isSpecial: true
  }]
}];