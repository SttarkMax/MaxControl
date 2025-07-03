
import React from 'react';

interface BanknotesIconProps extends React.SVGProps<SVGSVGElement> {
  title?: string;
}

const BanknotesIcon: React.FC<BanknotesIconProps> = ({ title, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v15B50.088 21 50.088 21 21 21s.094-.009.141-.024L20.25 18.75M3.75 18v.75c0 .414.336.75.75.75h.75M19.5 15.75v.75c0 .414.336.75.75.75h.75m0-1.5h.375c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125h-1.5a3.75 3.75 0 0 1-3.75-3.75V15.75m0-3V8.25m0 0a3.75 3.75 0 0 1 3.75-3.75h1.5A3.75 3.75 0 0 1 21 8.25v1.5M12 18.375V12m0 0V5.625m0 0a3.75 3.75 0 0 1 3.75-3.75h1.5A3.75 3.75 0 0 1 18 5.625v3.188m0 0A3.75 3.75 0 0 1 15.75 12h-1.5a3.75 3.75 0 0 1-3.75-3.75Z" />
  </svg>
);
export default BanknotesIcon;