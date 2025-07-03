
import React from 'react';

const LightBulbIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.355a3.375 3.375 0 0 1-3 0m3-1.121c1.28-.564 1.886-1.803 1.543-3.031C15.936 10.021 14.86 9 13.5 9H10.5c-1.36 0-2.436 1.021-2.787 2.298C7.37 12.526 7.976 13.765 9.256 14.33M15 12V7.5a3.75 3.75 0 0 0-7.5 0V12m3 3.75v.375A2.625 2.625 0 1 0 12 15.75V12" />
  </svg>
);
export default LightBulbIcon;