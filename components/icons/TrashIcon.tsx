
import React from 'react';

interface TrashIconProps extends React.SVGProps<SVGSVGElement> {
  title?: string;
}

const TrashIcon: React.FC<TrashIconProps> = ({ title, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c1.153 0 2.242.078 3.324.214m9.236-1.112a2.25 2.25 0 0 0-2.244-2.077H8.084a2.25 2.25 0 0 0-2.244 2.077m0 0L3 5.79m0 0c0-.128.01-.253.029-.376A2.25 2.25 0 0 1 5.23 3.375h13.54a2.25 2.25 0 0 1 2.215 2.04M16.5 5.625h-9" />
  </svg>
);
export default TrashIcon;