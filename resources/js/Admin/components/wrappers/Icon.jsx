import { Icon as IconifyIcon } from '@iconify/react';
const Icon = ({
  icon,
  name,
  ...props
}) => {
  return <IconifyIcon icon={`tabler:${icon || name}`} {...props} />;
};
export default Icon;