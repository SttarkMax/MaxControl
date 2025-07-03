
import React from 'react';

interface ArchiveBoxIconProps extends React.SVGProps<SVGSVGElement> {
  title?: string;
}

const ArchiveBoxIcon: React.FC<ArchiveBoxIconProps> = ({ title, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5m-16.5 0A2.25 2.25 0 0 1 6 7.5h12a2.25 2.25 0 0 1 2.25 2.25m-16.5 0v1.875c0 .621.504 1.125 1.125 1.125h14.25c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5A2.25 2.25 0 0 0 18 18.75V12.75a2.25 2.25 0 0 0-2.25-2.25H8.25A2.25 2.25 0 0 0 6 12.75v6A2.25 2.25 0 0 0 8.25 21Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75v-3.75" />
  </svg>
);
export default ArchiveBoxIcon;