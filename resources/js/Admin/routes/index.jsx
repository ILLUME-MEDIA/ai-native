import { lazy } from 'react';
import { Navigate } from 'react-router';
import MainLayout from '@admin/layouts/MainLayout';
import AuthRedirect from '@admin/components/AuthRedirect';

// Auth paths: when Admin SPA is loaded at /admin/login etc., redirect to real auth page (full load)
const authPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/confirm-password'];
const authRedirectRoutes = authPaths.map((path) => ({
  path,
  element: <AuthRedirect />,
}));

export const routes = [
  ...authRedirectRoutes,
  {
    path: '/',
    element: <Navigate to="/dashboard/ecommerce" replace />
  }, {
  element: <MainLayout />,
  children: [{
    path: '/apps/api-keys',
    Component: lazy(() => import('@admin/views/admin/apps/api-keys'))
  }, {
    path: '/apps/case-studies',
    Component: lazy(() => import('@admin/views/admin/apps/case-studies/CaseStudyList'))
  }, {
    path: '/apps/case-studies/create',
    Component: lazy(() => import('@admin/views/admin/apps/case-studies/CaseStudyCreate'))
  }, {
    path: '/apps/case-studies/:id/edit',
    Component: lazy(() => import('@admin/views/admin/apps/case-studies/CaseStudyEdit'))
  }, {
    path: '/apps/sections',
    Component: lazy(() => import('@admin/views/admin/apps/sections/SectionList'))
  }, {
    path: '/apps/sections/create',
    Component: lazy(() => import('@admin/views/admin/apps/sections/SectionCreate'))
  }, {
    path: '/apps/sections/:id/edit',
    Component: lazy(() => import('@admin/views/admin/apps/sections/SectionEdit'))
  }, {
    path: '/apps/sections/data/:entityId',
    Component: lazy(() => import('@admin/views/admin/apps/sections/EntityDataList'))
  }, {
    path: '/api/:id',
    Component: lazy(() => import('@admin/views/admin/apps/sections/SectionApi'))
  }, {
    path: '/apps/code-editor',
    Component: lazy(() => import('@admin/views/admin/apps/code-editor/CodeEditor'))
  }, {
    path: '/apps/blog/add',
    Component: lazy(() => import('@admin/views/admin/apps/blog/add'))
  }, {
    path: '/apps/blog/article',
    Component: lazy(() => import('@admin/views/admin/apps/blog/article'))
  }, {
    path: '/apps/blog/grid',
    Component: lazy(() => import('@admin/views/admin/apps/blog/grid'))
  }, {
    path: '/apps/blog/list',
    Component: lazy(() => import('@admin/views/admin/apps/blog/list'))
  }, {
    path: '/apps/calendar',
    Component: lazy(() => import('@admin/views/admin/apps/calendar'))
  }, {
    path: '/apps/chat',
    Component: lazy(() => import('@admin/views/admin/apps/chat'))
  }, {
    path: '/apps/clients',
    Component: lazy(() => import('@admin/views/admin/apps/clients'))
  }, {
    path: '/apps/companies',
    Component: lazy(() => import('@admin/views/admin/apps/companies'))
  }, {
    path: '/apps/crm/activities',
    Component: lazy(() => import('@admin/views/admin/apps/crm/activities'))
  }, {
    path: '/apps/crm/campaign',
    Component: lazy(() => import('@admin/views/admin/apps/crm/campaign'))
  }, {
    path: '/apps/crm/contacts',
    Component: lazy(() => import('@admin/views/admin/apps/crm/contacts'))
  }, {
    path: '/apps/crm/customers',
    Component: lazy(() => import('@admin/views/admin/apps/crm/customers'))
  }, {
    path: '/apps/crm/deals',
    Component: lazy(() => import('@admin/views/admin/apps/crm/deals'))
  }, {
    path: '/apps/crm/estimations',
    Component: lazy(() => import('@admin/views/admin/apps/crm/estimations'))
  }, {
    path: '/apps/crm/leads',
    Component: lazy(() => import('@admin/views/admin/apps/crm/leads'))
  }, {
    path: '/apps/crm/opportunities',
    Component: lazy(() => import('@admin/views/admin/apps/crm/opportunities'))
  }, {
    path: '/apps/crm/pipeline',
    Component: lazy(() => import('@admin/views/admin/apps/crm/pipeline'))
  }, {
    path: '/apps/crm/proposals',
    Component: lazy(() => import('@admin/views/admin/apps/crm/proposals'))
  }, {
    path: '/apps/ecommerce/attributes',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/attributes'))
  }, {
    path: '/apps/ecommerce/cart',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/cart'))
  }, {
    path: '/apps/ecommerce/categories',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/categories'))
  }, {
    path: '/apps/ecommerce/menu-categories',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/menu-categories'))
  }, {
    path: '/apps/ecommerce/menu-category-types',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/menu-category-types'))
  }, {
    path: '/apps/ecommerce/checkout',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/checkout'))
  }, {
    path: '/apps/ecommerce/customers',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/customers'))
  }, {
    path: '/apps/ecommerce/order-add',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/orders/order-add'))
  }, {
    path: '/apps/ecommerce/order-details',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/orders/order-details'))
  }, {
    path: '/apps/ecommerce/orders',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/orders/orders'))
  }, {
    path: '/apps/ecommerce/product-add',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/products/product-add'))
  }, {
    path: '/apps/ecommerce/product-details',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/products/product-details'))
  }, {
    path: '/apps/ecommerce/product-stocks',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/inventory/product-stocks'))
  }, {
    path: '/apps/ecommerce/product-views',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/reports/product-views'))
  }, {
    path: '/apps/ecommerce/products',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/products/products'))
  }, {
    path: '/apps/ecommerce/products-grid',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/products/products-grid'))
  }, {
    path: '/apps/ecommerce/purchased-orders',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/inventory/purchased-orders'))
  }, {
    path: '/apps/ecommerce/refunds',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/refunds'))
  }, {
    path: '/apps/ecommerce/reviews',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/reviews'))
  }, {
    path: '/apps/ecommerce/sales',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/reports/sales'))
  }, {
    path: '/apps/ecommerce/seller-details',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/sellers/seller-details'))
  }, {
    path: '/apps/ecommerce/sellers',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/sellers/sellers'))
  }, {
    path: '/apps/ecommerce/registrations',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/registrations'))
  }, {
    path: '/apps/ecommerce/muzzhub-categories',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/muzzhub-categories'))
  }, {
    path: '/apps/ecommerce/deliveries',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/deliveries'))
  }, {
    path: '/apps/ecommerce/settings',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/settings'))
  }, {
    path: '/apps/ecommerce/warehouse',
    Component: lazy(() => import('@admin/views/admin/apps/ecommerce/inventory/warehouse'))
  }, {
    path: '/apps/email/compose',
    Component: lazy(() => import('@admin/views/admin/apps/email/compose'))
  }, {
    path: '/apps/email/details',
    Component: lazy(() => import('@admin/views/admin/apps/email/details'))
  }, {
    path: '/apps/email/inbox',
    Component: lazy(() => import('@admin/views/admin/apps/email/inbox'))
  }, {
    path: '/apps/file-manager',
    Component: lazy(() => import('@admin/views/admin/apps/file-manager'))
  }, {
    path: '/apps/finance/banks-cards',
    Component: lazy(() => import('@admin/views/admin/apps/finance/banks-cards'))
  }, {
    path: '/apps/finance/expense-category',
    Component: lazy(() => import('@admin/views/admin/apps/finance/expense-category'))
  }, {
    path: '/apps/finance/expenses',
    Component: lazy(() => import('@admin/views/admin/apps/finance/expenses'))
  }, {
    path: '/apps/finance/income',
    Component: lazy(() => import('@admin/views/admin/apps/finance/income'))
  }, {
    path: '/apps/finance/transactions',
    Component: lazy(() => import('@admin/views/admin/apps/finance/transactions'))
  }, {
    path: '/apps/forum/post',
    Component: lazy(() => import('@admin/views/admin/apps/forum/post'))
  }, {
    path: '/apps/forum/view',
    Component: lazy(() => import('@admin/views/admin/apps/forum/view'))
  }, {
    path: '/apps/hrm/attendance',
    Component: lazy(() => import('@admin/views/admin/apps/hrm/attendance'))
  }, {
    path: '/apps/hrm/create-salary-slip',
    Component: lazy(() => import('@admin/views/admin/apps/hrm/create-salary-slip'))
  }, {
    path: '/apps/hrm/departments',
    Component: lazy(() => import('@admin/views/admin/apps/hrm/departments'))
  }, {
    path: '/apps/hrm/holidays',
    Component: lazy(() => import('@admin/views/admin/apps/hrm/holidays'))
  }, {
    path: '/apps/hrm/leave-add',
    Component: lazy(() => import('@admin/views/admin/apps/hrm/leave-add'))
  }, {
    path: '/apps/hrm/leaves',
    Component: lazy(() => import('@admin/views/admin/apps/hrm/leaves'))
  }, {
    path: '/apps/hrm/payroll',
    Component: lazy(() => import('@admin/views/admin/apps/hrm/payroll'))
  }, {
    path: '/apps/hrm/staff-add',
    Component: lazy(() => import('@admin/views/admin/apps/hrm/staff-add'))
  }, {
    path: '/apps/hrm/staff-profile',
    Component: lazy(() => import('@admin/views/admin/apps/hrm/staff-profile'))
  }, {
    path: '/apps/hrm/staffs',
    Component: lazy(() => import('@admin/views/admin/apps/hrm/staffs'))
  }, {
    path: '/apps/invoice/create',
    Component: lazy(() => import('@admin/views/admin/apps/invoice/create'))
  }, {
    path: '/apps/invoice/details',
    Component: lazy(() => import('@admin/views/admin/apps/invoice/details'))
  }, {
    path: '/apps/invoice/list',
    Component: lazy(() => import('@admin/views/admin/apps/invoice/list'))
  }, {
    path: '/apps/issue-tracker',
    Component: lazy(() => import('@admin/views/admin/apps/issue-tracker'))
  }, {
    path: '/apps/manage',
    Component: lazy(() => import('@admin/views/admin/apps/manage'))
  }, {
    path: '/apps/outlook',
    Component: lazy(() => import('@admin/views/admin/apps/outlook'))
  }, {
    path: '/apps/pin-board',
    Component: lazy(() => import('@admin/views/admin/apps/pin-board'))
  }, {
    path: '/apps/pro-ai',
    Component: lazy(() => import('@admin/views/admin/apps/pro-ai'))
  }, {
    path: '/apps/projects/activity',
    Component: lazy(() => import('@admin/views/admin/apps/projects/activity'))
  }, {
    path: '/apps/projects/details',
    Component: lazy(() => import('@admin/views/admin/apps/projects/details'))
  }, {
    path: '/apps/projects/grid',
    Component: lazy(() => import('@admin/views/admin/apps/projects/grid'))
  }, {
    path: '/apps/projects/kanban',
    Component: lazy(() => import('@admin/views/admin/apps/projects/kanban'))
  }, {
    path: '/apps/projects/list',
    Component: lazy(() => import('@admin/views/admin/apps/projects/list'))
  }, {
    path: '/apps/projects/team-board',
    Component: lazy(() => import('@admin/views/admin/apps/projects/team-board'))
  }, {
    path: '/apps/promo/coupons',
    Component: lazy(() => import('@admin/views/admin/apps/promo/coupons'))
  }, {
    path: '/apps/promo/discounts',
    Component: lazy(() => import('@admin/views/admin/apps/promo/discounts'))
  }, {
    path: '/apps/promo/gift-cards',
    Component: lazy(() => import('@admin/views/admin/apps/promo/gift-cards'))
  }, {
    path: '/apps/social-feed',
    Component: lazy(() => import('@admin/views/admin/apps/social-feed'))
  }, {
    path: '/apps/task/create',
    Component: lazy(() => import('@admin/views/admin/apps/task/create'))
  }, {
    path: '/apps/task/details',
    Component: lazy(() => import('@admin/views/admin/apps/task/details'))
  }, {
    path: '/apps/task/list',
    Component: lazy(() => import('@admin/views/admin/apps/task/list'))
  }, {
    path: '/apps/ticket/create',
    Component: lazy(() => import('@admin/views/admin/apps/ticket/create'))
  }, {
    path: '/apps/ticket/details',
    Component: lazy(() => import('@admin/views/admin/apps/ticket/details'))
  }, {
    path: '/apps/ticket/list',
    Component: lazy(() => import('@admin/views/admin/apps/ticket/list'))
  }, {
    path: '/apps/todo',
    Component: lazy(() => import('@admin/views/admin/apps/todo'))
  }, {
    path: '/apps/yelp',
    Component: lazy(() => import('@admin/views/admin/apps/yelp'))
  }, {
    path: '/apps/otp-auth',
    Component: lazy(() => import('@admin/views/admin/apps/otp-auth'))
  }, {
    path: '/ai/endpoints',
    Component: lazy(() => import('@admin/views/admin/ai-agent/Endpoints'))
  }, {
    path: '/ai/jira-config',
    Component: lazy(() => import('@admin/views/admin/ai-agent/JiraConfig'))
  }, {
    path: '/ai/platforms',
    Component: lazy(() => import('@admin/views/admin/ai-agent/Platforms'))
  }, {
    path: '/ai/chat',
    Component: lazy(() => import('@admin/views/admin/ai-agent/Chat'))
  }, {
    path: '/ai/duties',
    Component: lazy(() => import('@admin/views/admin/ai-agent/Duties'))
  }, {
    path: '/ai/scrapers',
    Component: lazy(() => import('@admin/views/admin/ai-agent/Scrapers'))
  }, {
    path: '/ai/skills',
    Component: lazy(() => import('@admin/views/admin/ai-agent/Skills'))
  }, {
    path: '/ai/rules',
    Component: lazy(() => import('@admin/views/admin/ai-agent/Rules'))
  }, {
    path: '/apps/users/account-settings',
    Component: lazy(() => import('@admin/views/admin/apps/users/account-settings'))
  }, {
    path: '/apps/users/contacts',
    Component: lazy(() => import('@admin/views/admin/apps/users/contacts'))
  }, {
    path: '/apps/users/permissions',
    Component: lazy(() => import('@admin/views/admin/apps/users/permissions'))
  }, {
    path: '/apps/users/profile',
    Component: lazy(() => import('@admin/views/admin/apps/users/profile'))
  }, {
    path: '/apps/users/role-details',
    Component: lazy(() => import('@admin/views/admin/apps/users/role-details'))
  }, {
    path: '/apps/users/roles',
    Component: lazy(() => import('@admin/views/admin/apps/users/roles'))
  }, {
    path: '/apps/vote-list',
    Component: lazy(() => import('@admin/views/admin/apps/vote-list'))
  }, {
    path: '/charts/apex/area',
    Component: lazy(() => import('@admin/views/admin/charts/apex/area'))
  }, {
    path: '/charts/apex/bar',
    Component: lazy(() => import('@admin/views/admin/charts/apex/bar'))
  }, {
    path: '/charts/apex/boxplot',
    Component: lazy(() => import('@admin/views/admin/charts/apex/boxplot'))
  }, {
    path: '/charts/apex/bubble',
    Component: lazy(() => import('@admin/views/admin/charts/apex/bubble'))
  }, {
    path: '/charts/apex/candlestick',
    Component: lazy(() => import('@admin/views/admin/charts/apex/candlestick'))
  }, {
    path: '/charts/apex/column',
    Component: lazy(() => import('@admin/views/admin/charts/apex/column'))
  }, {
    path: '/charts/apex/funnel',
    Component: lazy(() => import('@admin/views/admin/charts/apex/funnel'))
  }, {
    path: '/charts/apex/heatmap',
    Component: lazy(() => import('@admin/views/admin/charts/apex/heatmap'))
  }, {
    path: '/charts/apex/line',
    Component: lazy(() => import('@admin/views/admin/charts/apex/line'))
  }, {
    path: '/charts/apex/mixed',
    Component: lazy(() => import('@admin/views/admin/charts/apex/mixed'))
  }, {
    path: '/charts/apex/pie',
    Component: lazy(() => import('@admin/views/admin/charts/apex/pie'))
  }, {
    path: '/charts/apex/polar-area',
    Component: lazy(() => import('@admin/views/admin/charts/apex/polar-area'))
  }, {
    path: '/charts/apex/radar',
    Component: lazy(() => import('@admin/views/admin/charts/apex/radar'))
  }, {
    path: '/charts/apex/radialbar',
    Component: lazy(() => import('@admin/views/admin/charts/apex/radialbar'))
  }, {
    path: '/charts/apex/range',
    Component: lazy(() => import('@admin/views/admin/charts/apex/range'))
  }, {
    path: '/charts/apex/scatter',
    Component: lazy(() => import('@admin/views/admin/charts/apex/scatter'))
  }, {
    path: '/charts/apex/slope',
    Component: lazy(() => import('@admin/views/admin/charts/apex/slope'))
  }, {
    path: '/charts/apex/sparklines',
    Component: lazy(() => import('@admin/views/admin/charts/apex/sparklines'))
  }, {
    path: '/charts/apex/timeline',
    Component: lazy(() => import('@admin/views/admin/charts/apex/timeline'))
  }, {
    path: '/charts/apex/treemap',
    Component: lazy(() => import('@admin/views/admin/charts/apex/treemap'))
  }, {
    path: '/charts/chartjs/area',
    Component: lazy(() => import('@admin/views/admin/charts/chartjs/area'))
  }, {
    path: '/charts/chartjs/bar',
    Component: lazy(() => import('@admin/views/admin/charts/chartjs/bar'))
  }, {
    path: '/charts/chartjs/line',
    Component: lazy(() => import('@admin/views/admin/charts/chartjs/line'))
  }, {
    path: '/charts/chartjs/other',
    Component: lazy(() => import('@admin/views/admin/charts/chartjs/other'))
  }, {
    path: '/charts/echart/area',
    Component: lazy(() => import('@admin/views/admin/charts/echart/area'))
  }, {
    path: '/charts/echart/bar',
    Component: lazy(() => import('@admin/views/admin/charts/echart/bar'))
  }, {
    path: '/charts/echart/candlestick',
    Component: lazy(() => import('@admin/views/admin/charts/echart/candlestick'))
  }, {
    path: '/charts/echart/gauge',
    Component: lazy(() => import('@admin/views/admin/charts/echart/gauge'))
  }, {
    path: '/charts/echart/geo-map',
    Component: lazy(() => import('@admin/views/admin/charts/echart/geo-map'))
  }, {
    path: '/charts/echart/heatmap',
    Component: lazy(() => import('@admin/views/admin/charts/echart/heatmap'))
  }, {
    path: '/charts/echart/line',
    Component: lazy(() => import('@admin/views/admin/charts/echart/line'))
  }, {
    path: '/charts/echart/other',
    Component: lazy(() => import('@admin/views/admin/charts/echart/other'))
  }, {
    path: '/charts/echart/pie',
    Component: lazy(() => import('@admin/views/admin/charts/echart/pie'))
  }, {
    path: '/charts/echart/radar',
    Component: lazy(() => import('@admin/views/admin/charts/echart/radar'))
  }, {
    path: '/charts/echart/scatter',
    Component: lazy(() => import('@admin/views/admin/charts/echart/scatter'))
  }, {
    path: '/dashboard/analytics',
    Component: lazy(() => import('@admin/views/admin/dashboard/analytics'))
  }, {
    path: '/dashboard/crm',
    Component: lazy(() => import('@admin/views/admin/dashboard/crm'))
  }, {
    path: '/dashboard/ecommerce',
    Component: lazy(() => import('@admin/views/admin/dashboard/ecommerce'))
  }, {
    path: '/dashboard/finance',
    Component: lazy(() => import('@admin/views/admin/dashboard/finance'))
  }, {
    path: '/dashboard/projects',
    Component: lazy(() => import('@admin/views/admin/dashboard/projects'))
  }, {
    path: '/form/cropper',
    Component: lazy(() => import('@admin/views/admin/form/cropper'))
  }, {
    path: '/form/elements',
    Component: lazy(() => import('@admin/views/admin/form/elements'))
  }, {
    path: '/form/fileuploads',
    Component: lazy(() => import('@admin/views/admin/form/fileuploads'))
  }, {
    path: '/form/layout',
    Component: lazy(() => import('@admin/views/admin/form/layout'))
  }, {
    path: '/form/other-plugin',
    Component: lazy(() => import('@admin/views/admin/form/other-plugin'))
  }, {
    path: '/form/pickers',
    Component: lazy(() => import('@admin/views/admin/form/pickers'))
  }, {
    path: '/form/range-slider',
    Component: lazy(() => import('@admin/views/admin/form/range-slider'))
  }, {
    path: '/form/select',
    Component: lazy(() => import('@admin/views/admin/form/select'))
  }, {
    path: '/form/text-editors',
    Component: lazy(() => import('@admin/views/admin/form/text-editors'))
  }, {
    path: '/form/validation',
    Component: lazy(() => import('@admin/views/admin/form/validation'))
  }, {
    path: '/form/wizard',
    Component: lazy(() => import('@admin/views/admin/form/wizard'))
  }, {
    path: '/icons/boxicons',
    Component: lazy(() => import('@admin/views/admin/icons/boxicons'))
  }, {
    path: '/icons/flags',
    Component: lazy(() => import('@admin/views/admin/icons/flags'))
  }, {
    path: '/icons/lucide',
    Component: lazy(() => import('@admin/views/admin/icons/lucide'))
  }, {
    path: '/icons/remix',
    Component: lazy(() => import('@admin/views/admin/icons/remix'))
  }, {
    path: '/icons/solar-broken',
    Component: lazy(() => import('@admin/views/admin/icons/solar-broken'))
  }, {
    path: '/icons/solar-duotone',
    Component: lazy(() => import('@admin/views/admin/icons/solar-duotone'))
  }, {
    path: '/icons/tabler',
    Component: lazy(() => import('@admin/views/admin/icons/tabler'))
  }, {
    path: '/layouts/boxed',
    Component: lazy(() => import('@admin/views/admin/layouts/boxed'))
  }, {
    path: '/layouts/compact',
    Component: lazy(() => import('@admin/views/admin/layouts/compact'))
  }, {
    path: '/layouts/horizontal',
    Component: lazy(() => import('@admin/views/admin/layouts/horizontal'))
  }, {
    path: '/layouts/preloader',
    Component: lazy(() => import('@admin/views/admin/layouts/preloader'))
  }, {
    path: '/layouts/scrollable',
    Component: lazy(() => import('@admin/views/admin/layouts/scrollable'))
  }, {
    path: '/layouts/sidebar-compact',
    Component: lazy(() => import('@admin/views/admin/layouts/sidebar-compact'))
  }, {
    path: '/layouts/sidebar-gradient',
    Component: lazy(() => import('@admin/views/admin/layouts/sidebar-gradient'))
  }, {
    path: '/layouts/sidebar-gray',
    Component: lazy(() => import('@admin/views/admin/layouts/sidebar-gray'))
  }, {
    path: '/layouts/sidebar-image',
    Component: lazy(() => import('@admin/views/admin/layouts/sidebar-image'))
  }, {
    path: '/layouts/sidebar-light',
    Component: lazy(() => import('@admin/views/admin/layouts/sidebar-light'))
  }, {
    path: '/layouts/sidebar-no-icons',
    Component: lazy(() => import('@admin/views/admin/layouts/sidebar-no-icons'))
  }, {
    path: '/layouts/sidebar-offcanvas',
    Component: lazy(() => import('@admin/views/admin/layouts/sidebar-offcanvas'))
  }, {
    path: '/layouts/sidebar-on-hover',
    Component: lazy(() => import('@admin/views/admin/layouts/sidebar-on-hover'))
  }, {
    path: '/layouts/sidebar-with-lines',
    Component: lazy(() => import('@admin/views/admin/layouts/sidebar-with-lines'))
  }, {
    path: '/layouts/topbar-dark',
    Component: lazy(() => import('@admin/views/admin/layouts/topbar-dark'))
  }, {
    path: '/layouts/topbar-gradient',
    Component: lazy(() => import('@admin/views/admin/layouts/topbar-gradient'))
  }, {
    path: '/layouts/topbar-gray',
    Component: lazy(() => import('@admin/views/admin/layouts/topbar-gray'))
  }, {
    path: '/maps/google',
    Component: lazy(() => import('@admin/views/admin/maps/google'))
  }, {
    path: '/maps/leaflet',
    Component: lazy(() => import('@admin/views/admin/maps/leaflet'))
  }, {
    path: '/maps/vector',
    Component: lazy(() => import('@admin/views/admin/maps/vector'))
  }, {
    path: '/pages/about-us',
    Component: lazy(() => import('@admin/views/admin/pages/about-us'))
  }, {
    path: '/pages/contact-us',
    Component: lazy(() => import('@admin/views/admin/pages/contact-us'))
  }, {
    path: '/pages/empty',
    Component: lazy(() => import('@admin/views/admin/pages/empty'))
  }, {
    path: '/pages/faq',
    Component: lazy(() => import('@admin/views/admin/pages/faq'))
  }, {
    path: '/pages/gallery',
    Component: lazy(() => import('@admin/views/admin/pages/gallery'))
  }, {
    path: '/pages/pricing',
    Component: lazy(() => import('@admin/views/admin/pages/pricing'))
  }, {
    path: '/pages/privacy-policy',
    Component: lazy(() => import('@admin/views/admin/pages/privacy-policy'))
  }, {
    path: '/pages/search-results',
    Component: lazy(() => import('@admin/views/admin/pages/search-results'))
  }, {
    path: '/pages/sitemap',
    Component: lazy(() => import('@admin/views/admin/pages/sitemap'))
  }, {
    path: '/pages/terms-conditions',
    Component: lazy(() => import('@admin/views/admin/pages/terms-conditions'))
  }, {
    path: '/pages/timeline',
    Component: lazy(() => import('@admin/views/admin/pages/timeline'))
  }, {
    path: '/plugins/animation',
    Component: lazy(() => import('@admin/views/admin/plugins/animation'))
  }, {
    path: '/plugins/clipboard',
    Component: lazy(() => import('@admin/views/admin/plugins/clipboard'))
  }, {
    path: '/plugins/idle-timer',
    Component: lazy(() => import('@admin/views/admin/plugins/idle-timer'))
  }, {
    path: '/plugins/masonry',
    Component: lazy(() => import('@admin/views/admin/plugins/masonry'))
  }, {
    path: '/plugins/pass-meter',
    Component: lazy(() => import('@admin/views/admin/plugins/pass-meter'))
  }, {
    path: '/plugins/pdf-viewer',
    Component: lazy(() => import('@admin/views/admin/plugins/pdf-viewer'))
  }, {
    path: '/plugins/sweet-alerts',
    Component: lazy(() => import('@admin/views/admin/plugins/sweet-alerts'))
  }, {
    path: '/plugins/tour',
    Component: lazy(() => import('@admin/views/admin/plugins/tour'))
  }, {
    path: '/plugins/tree-view',
    Component: lazy(() => import('@admin/views/admin/plugins/tree-view'))
  }, {
    path: '/plugins/video-player',
    Component: lazy(() => import('@admin/views/admin/plugins/video-player'))
  }, {
    path: '/tables/custom',
    Component: lazy(() => import('@admin/views/admin/tables/custom'))
  }, {
    path: '/tables/datatables/ajax',
    Component: lazy(() => import('@admin/views/admin/tables/datatables/ajax'))
  }, {
    path: '/tables/datatables/basic',
    Component: lazy(() => import('@admin/views/admin/tables/datatables/basic'))
  }, {
    path: '/tables/datatables/checkbox-select',
    Component: lazy(() => import('@admin/views/admin/tables/datatables/checkbox-select'))
  }, {
    path: '/tables/datatables/child-rows',
    Component: lazy(() => import('@admin/views/admin/tables/datatables/child-rows'))
  }, {
    path: '/tables/datatables/column-searching',
    Component: lazy(() => import('@admin/views/admin/tables/datatables/column-searching'))
  }, {
    path: '/tables/datatables/columns',
    Component: lazy(() => import('@admin/views/admin/tables/datatables/columns'))
  }, {
    path: '/tables/datatables/export-data',
    Component: lazy(() => import('@admin/views/admin/tables/datatables/export-data'))
  }, {
    path: '/tables/datatables/fixed-columns',
    Component: lazy(() => import('@admin/views/admin/tables/datatables/fixed-columns'))
  }, {
    path: '/tables/datatables/fixed-header',
    Component: lazy(() => import('@admin/views/admin/tables/datatables/fixed-header'))
  }, {
    path: '/tables/datatables/javascript',
    Component: lazy(() => import('@admin/views/admin/tables/datatables/javascript'))
  }, {
    path: '/tables/datatables/range-search',
    Component: lazy(() => import('@admin/views/admin/tables/datatables/range-search'))
  }, {
    path: '/tables/datatables/rendering',
    Component: lazy(() => import('@admin/views/admin/tables/datatables/rendering'))
  }, {
    path: '/tables/datatables/rows-add',
    Component: lazy(() => import('@admin/views/admin/tables/datatables/rows-add'))
  }, {
    path: '/tables/datatables/scroll',
    Component: lazy(() => import('@admin/views/admin/tables/datatables/scroll'))
  }, {
    path: '/tables/datatables/select',
    Component: lazy(() => import('@admin/views/admin/tables/datatables/select'))
  }, {
    path: '/tables/static',
    Component: lazy(() => import('@admin/views/admin/tables/static'))
  }, {
    path: '/ui/accordions',
    Component: lazy(() => import('@admin/views/admin/ui/accordions'))
  }, {
    path: '/ui/alerts',
    Component: lazy(() => import('@admin/views/admin/ui/alerts'))
  }, {
    path: '/ui/badges',
    Component: lazy(() => import('@admin/views/admin/ui/badges'))
  }, {
    path: '/ui/breadcrumb',
    Component: lazy(() => import('@admin/views/admin/ui/breadcrumb'))
  }, {
    path: '/ui/buttons',
    Component: lazy(() => import('@admin/views/admin/ui/buttons'))
  }, {
    path: '/ui/cards',
    Component: lazy(() => import('@admin/views/admin/ui/cards'))
  }, {
    path: '/ui/carousel',
    Component: lazy(() => import('@admin/views/admin/ui/carousel'))
  }, {
    path: '/ui/collapse',
    Component: lazy(() => import('@admin/views/admin/ui/collapse'))
  }, {
    path: '/ui/colors',
    Component: lazy(() => import('@admin/views/admin/ui/colors'))
  }, {
    path: '/ui/dropdowns',
    Component: lazy(() => import('@admin/views/admin/ui/dropdowns'))
  }, {
    path: '/ui/grid',
    Component: lazy(() => import('@admin/views/admin/ui/grid'))
  }, {
    path: '/ui/images',
    Component: lazy(() => import('@admin/views/admin/ui/images'))
  }, {
    path: '/ui/links',
    Component: lazy(() => import('@admin/views/admin/ui/links'))
  }, {
    path: '/ui/list-group',
    Component: lazy(() => import('@admin/views/admin/ui/list-group'))
  }, {
    path: '/ui/modals',
    Component: lazy(() => import('@admin/views/admin/ui/modals'))
  }, {
    path: '/ui/notifications',
    Component: lazy(() => import('@admin/views/admin/ui/notifications'))
  }, {
    path: '/ui/offcanvas',
    Component: lazy(() => import('@admin/views/admin/ui/offcanvas'))
  }, {
    path: '/ui/pagination',
    Component: lazy(() => import('@admin/views/admin/ui/pagination'))
  }, {
    path: '/ui/placeholders',
    Component: lazy(() => import('@admin/views/admin/ui/placeholders'))
  }, {
    path: '/ui/popovers',
    Component: lazy(() => import('@admin/views/admin/ui/popovers'))
  }, {
    path: '/ui/progress',
    Component: lazy(() => import('@admin/views/admin/ui/progress'))
  }, {
    path: '/ui/spinners',
    Component: lazy(() => import('@admin/views/admin/ui/spinners'))
  }, {
    path: '/ui/tabs',
    Component: lazy(() => import('@admin/views/admin/ui/tabs'))
  }, {
    path: '/ui/tooltips',
    Component: lazy(() => import('@admin/views/admin/ui/tooltips'))
  }, {
    path: '/ui/typography',
    Component: lazy(() => import('@admin/views/admin/ui/typography'))
  }, {
    path: '/ui/utilities',
    Component: lazy(() => import('@admin/views/admin/ui/utilities'))
  }, {
    path: '/ui/videos',
    Component: lazy(() => import('@admin/views/admin/ui/videos'))
  }, {
    path: '/widgets/charts',
    Component: lazy(() => import('@admin/views/admin/widgets/charts'))
  }, {
    path: '/widgets/mixed',
    Component: lazy(() => import('@admin/views/admin/widgets/mixed'))
  }, {
    path: '/widgets/social',
    Component: lazy(() => import('@admin/views/admin/widgets/social'))
  }, {
    path: '/widgets/statistics',
    Component: lazy(() => import('@admin/views/admin/widgets/statistics'))
  }, {
    path: '/widgets/weather',
    Component: lazy(() => import('@admin/views/admin/widgets/weather'))
  }]
}, {
  path: '/auth/card/delete-account',
  Component: lazy(() => import('@admin/views/auth/card/delete-account'))
}, {
  path: '/auth/card/lock-screen',
  Component: lazy(() => import('@admin/views/auth/card/lock-screen'))
}, {
  path: '/auth/card/login-pin',
  Component: lazy(() => import('@admin/views/auth/card/login-pin'))
}, {
  path: '/auth/card/new-pass',
  Component: lazy(() => import('@admin/views/auth/card/new-pass'))
}, {
  path: '/auth/card/reset-pass',
  Component: lazy(() => import('@admin/views/auth/card/reset-pass'))
}, {
  path: '/auth/card/sign-in',
  Component: lazy(() => import('@admin/views/auth/card/sign-in'))
}, {
  path: '/auth/card/sign-up',
  Component: lazy(() => import('@admin/views/auth/card/sign-up'))
}, {
  path: '/auth/card/success-mail',
  Component: lazy(() => import('@admin/views/auth/card/success-mail'))
}, {
  path: '/auth/card/two-factor',
  Component: lazy(() => import('@admin/views/auth/card/two-factor'))
}, {
  path: '/auth/delete-account',
  Component: lazy(() => import('@admin/views/auth/basic/delete-account'))
}, {
  path: '/auth/lock-screen',
  Component: lazy(() => import('@admin/views/auth/basic/lock-screen'))
}, {
  path: '/auth/login-pin',
  Component: lazy(() => import('@admin/views/auth/basic/login-pin'))
}, {
  path: '/auth/new-pass',
  Component: lazy(() => import('@admin/views/auth/basic/new-pass'))
}, {
  path: '/auth/reset-pass',
  Component: lazy(() => import('@admin/views/auth/basic/reset-pass'))
}, {
  path: '/auth/sign-in',
  Component: lazy(() => import('@admin/views/auth/basic/sign-in'))
}, {
  path: '/auth/sign-up',
  Component: lazy(() => import('@admin/views/auth/basic/sign-up'))
}, {
  path: '/auth/split/delete-account',
  Component: lazy(() => import('@admin/views/auth/split/delete-account'))
}, {
  path: '/auth/split/lock-screen',
  Component: lazy(() => import('@admin/views/auth/split/lock-screen'))
}, {
  path: '/auth/split/login-pin',
  Component: lazy(() => import('@admin/views/auth/split/login-pin'))
}, {
  path: '/auth/split/new-pass',
  Component: lazy(() => import('@admin/views/auth/split/new-pass'))
}, {
  path: '/auth/split/reset-pass',
  Component: lazy(() => import('@admin/views/auth/split/reset-pass'))
}, {
  path: '/auth/split/sign-in',
  Component: lazy(() => import('@admin/views/auth/split/sign-in'))
}, {
  path: '/auth/split/sign-up',
  Component: lazy(() => import('@admin/views/auth/split/sign-up'))
}, {
  path: '/auth/split/success-mail',
  Component: lazy(() => import('@admin/views/auth/split/success-mail'))
}, {
  path: '/auth/split/two-factor',
  Component: lazy(() => import('@admin/views/auth/split/two-factor'))
}, {
  path: '/auth/success-mail',
  Component: lazy(() => import('@admin/views/auth/basic/success-mail'))
}, {
  path: '/auth/two-factor',
  Component: lazy(() => import('@admin/views/auth/basic/two-factor'))
}, {
  path: '/error/400',
  Component: lazy(() => import('@admin/views/error/400'))
}, {
  path: '/error/401',
  Component: lazy(() => import('@admin/views/error/401'))
}, {
  path: '/error/403',
  Component: lazy(() => import('@admin/views/error/403'))
}, {
  path: '/error/404',
  Component: lazy(() => import('@admin/views/error/404'))
}, {
  path: '/error/408',
  Component: lazy(() => import('@admin/views/error/408'))
}, {
  path: '/error/500',
  Component: lazy(() => import('@admin/views/error/500'))
}, {
  path: '/error/maintenance',
  Component: lazy(() => import('@admin/views/error/maintenance'))
}, {
  path: '/pages/coming-soon',
  Component: lazy(() => import('@admin/views/others/pages/coming-soon'))
}];
