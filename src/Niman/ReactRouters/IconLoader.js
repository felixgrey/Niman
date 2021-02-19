import React, { Component } from 'react';
import {errorLog} from '../Utilities';

export default class ComponentLoader extends Component {

  state = {
    loading: false,
    Image: null,
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
    
    if (this.state.Image) {
      return;
    }
    
    let {
      name,
    } = this.props;
    
    // console.log(component)

    if (this.props.name === undefined || this.props.name === null) {
      return;
    }
    
    await this.asyncSetState({
      loading: true,
    });
    
    name = name.replace(new RegExp('^\\./|^/', 'g'), '');
    
    let module = null;
    try{
      module = await import('@/components/images/' + name);
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
      Image: module.default,
      loading: false,
    });
  }

  render() {
    
    const {
      imgStyle = {},
      imgClassName = '',
    } = this.props


    const {
      loading,
      Image,
      notFound,
    } = this.state;
    
    if (notFound) {
      return '@/components/images/' + this.props.component + '未找到。'
    }

    if (loading) {
      return '加载中...'
    }
    
    if (Image) {
      return <img className={imgClassName} style={imgStyle} src={Image} />
    }
    
    return null;
  }
  
}
