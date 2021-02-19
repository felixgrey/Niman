import React, { Component } from 'react';
import {errorLog} from '../Utilities';

export default class ComponentLoader extends Component {

  state = {
    loading: false,
    ComponentClass: null,
    notFound: false,
  }
  
  asyncSetState(state) {
    return new Promise((resolve) => {
      this.setState(state, resolve);
    });
  }
  
  componentWillMount() {
    this.loadComponent();
  }

  async loadComponent() {
    
    if (this.state.ComponentClass) {
      return;
    }
    
    let {
      component
    } = this.props;

    if (this.props.component === undefined || this.props.component === null) {
      return;
    }
    
    await this.asyncSetState({
      loading: true,
    });
    
    component = component.replace(new RegExp('^\\./|^/', 'g'), '');
    
    let module = null;
    try{
      module = await import('@/pages/' + component);
    } catch(e){
      errorLog(e)
    }


    if (module === null || module === undefined) {
      this.setState({
        notFound: true,
        loading: false,
      });
      return;
    }
    
    this.setState({
      ComponentClass: module.default,
      loading: false,
    });
  }

  render() {


    const {
      loading,
      ComponentClass,
      notFound,
    } = this.state;
    
    if (notFound) {
      return '@/pages/' + this.props.component + '未找到。'
    }

    if (loading) {
      return '加载中...'
    }
    
    if (ComponentClass) {
      return <ComponentClass {...this.props.componentProps} >
        {this.props.children}
      </ComponentClass>
    }
    
    return this.props.children || null;
  }
  
}
