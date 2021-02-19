import React from 'react';
// import {createBrowserHistory} from 'history';
import { HashRouter,  Route , Switch, Redirect } from 'react-router-dom';
import ComponentLoader from './ComponentLoader';

function _renderRoute(item, parentPath = '') {
  let {
    path,
    redirect = null,
  } = item;
  
  if (redirect !== null) {
    return  <Redirect key={1} to={redirect} />
  }

  if (path === '/') {
    path = '';
  }
  
  let fullPath
  if (parentPath === '/') {
    fullPath = '/' +  path;
  } else {
    fullPath = parentPath + '/' + path
  }

  return <Route key={fullPath} path={fullPath} render={props =>{
    return <React.Fragment>
      <ComponentLoader component={item.component} componentProps={{...props}}>
        <Switch>
          {(item.routes || []).map(item2 => _renderRoute(item2, fullPath))}
        </Switch>
      </ComponentLoader>       
    </React.Fragment>
  }} />
}

// const history = createBrowserHistory();

export default function renderRoute(routers = []) {

  return <HashRouter >
    {routers.map(cfg => {
      return _renderRoute(cfg)
    })}
  </HashRouter>
}