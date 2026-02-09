import React, { createContext, useContext, useMemo } from 'react';

const InitialPropsContext = createContext({});

export const InitialPropsProvider = ({ children }) => {
  const initial = useMemo(() => {
    // Read server-provided payload exposed on the window by Blade
    try {
      return window.__INITIAL_PROPS__ ?? {};
    } catch (e) {
      return {};
    }
  }, []);

  return <InitialPropsContext.Provider value={initial}>{children}</InitialPropsContext.Provider>;
};

export const useInitialProps = () => useContext(InitialPropsContext);

export default InitialPropsContext;