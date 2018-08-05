import DOM from './dom'
import {instantiate, isSameElement} from './element'
import Reconciler from './reconciler'

function isComponentClass(type) {
  return (
    Boolean(type.prototype) &&
    Boolean(type.prototype.isComponent)
  )
}

function getKey(element) {
  return (element && element.key) ? element.key : ''
}

class DOMTextComponent {
  constructor(element) {
    this._currentElement = element
  }

  mountComponent() {
    const text = DOM.createElement(this._currentElement)
    this._domNode = text
    return text
  }

  receiveComponent(nextElement) {
    if (nextElement !== this._currentElement) {
      DOM.replaceNode(this._domNode, DOM.createElement(nextElement))
    }
  }

  unmountComponent() {
    // TODO: unmount text
  }
}

class DOMComponent {
  constructor(element) {
    this._currentElement = element
    this._domNode = null
  }

  mountComponent() {
    const el = DOM.createElement(this._currentElement)
    this._domNode = el
    this._updateDOMProps({}, this._currentElement.props)
    this._createChildren(this._currentElement.props)
    return el
  }

  unmountComponent() {
    console.log('this._currentElement', this._currentElement)
    // this.unmountChildren(this._currentElement.props)
  }

  unmountChildren(props) {
    props.chidlren.forEach(child => {
      Reconciler.unmountComponent(child)
    })
  }

  receiveComponent(nextElement) {
    this._currentElement = nextElement
    this.updateComponent(this._currentElement, nextElement)
  }

  mountChildren(children) {
    this._renderedChildren = {}
    const mountImages = children.map((child, index) => {
      const element = instantiate(child)
      element._mountIndex = index
      this._renderedChildren[index] = element
      return Reconciler.mountComponent(element)
    })    
    return mountImages
  }

  updateComponent(prevElement, nextElement) {
    this._currentElement = nextElement
    this._updateDOMProps(prevElement, nextElement)
    this._updateDOMChildren(prevElement.props, nextElement.props)
  }

  _createChildren(props) {
    let children = props.children
    if (!Array.isArray(children)) {
      children = [children]
    }
    const mountImages = this.mountChildren(children)
    for (const child of mountImages) {
      DOM.appendChild(this._domNode, child)
    }
  }

  _updateDOMProps(prevElement, nextElement) {
    DOM.updateProps(this._domNode, prevElement.props, nextElement.props)
  }

  _updateDOMChildren(prevProps, nextProps) {
    const updates = []
    const prevChildren = prevProps.children
    const nextChildren = nextProps.children
    if (typeof nextChildren === 'undefined') {
      return
    }
    this.updateChildren(this._domNode, prevChildren, nextChildren)
  }

  updateChildren(
    parentNode,
    prevChildren, // instances
    nextChildren, // elements
  ) {
    if (!prevChildren || !nextChildren) { return }
  
    // const length = Math.max(prevChildren.length, nextChildren.length)
    const mountImages = []
    const removedNodes = {}
    // let truthyChildCount = 0
  
    for (let i = 0; i < nextChildren.length; i++) {
      const prevChild = prevChildren[i]
      const prevElement = (prevChild && prevChild._currentElement) || null
      const nextElement = nextChildren[i]
  
      if (prevChild && isSameElement(prevElement, nextElement)) {
        nextChildren[i] = prevChild
        Reconciler.receiveComponent(prevChild, nextElement)
      } else {
        if (prevElement) {
          removedNodes[i] = prevChild._domNode
          Reconciler.unmountComponent(prevChild)
        }
        const nextChild = instantiate(nextElement)
        nextChildren[i] = nextChild
        mountImages.push(Reconciler.mountComponent(nextChild))
  
  
      }
      // if (nextChildren[i] != null && nextChildren[i] !== false) {
      //   truthyChildCount++
      // }
    }
    for (let i = 0; i < prevChildren.length; i++) {
      if (!nextChildren.hasOwnProperty(prevChildren[i])) {
        const prevChild = prevChildren[i]
        removedNodes[i] = prevChild._domNode
        Reconciler.unmountComponent(prevChild)
      }
    }
  
    let lastIndex = 0
    let nextMountIndex = 0
    let lastPlacedNode = null
  
    Object.keys(nextChildren).forEach((childKey, nextIndex) => {
      let prevChild = prevChildren[childKey]
      let nextChild = nextChildren[childKey]
  
      if (prevChild === nextChild) {
        if (prevChild._mountIndex < lastIndex) {
          DOM.insertChildAfter(parentNode, parentNode.childNodes[prevChild._mountIndex], lastIndex)
        }
        lastIndex = Math.max(prevChild._mountIndex, lastIndex)
        prevChild._mountIndex = nextIndex
      } else {
        if (prevChild) {
          lastIndex = Math.max(prevChild._mountIndex, lastIndex)
        }
  
        nextChild._mountIndex = nextIndex
        DOM.insertChildAfter(parentNode, mountImages[nextMountIndex], lastPlacedNode)
        nextMountIndex++
      }
      lastPlacedNode = nextChild._domNode
    })
  
    Object.keys(removedNodes).forEach(childKey => {
      try {
        DOM.removeChild(parentNode, removedNodes[childKey])
      } catch (e) {
        console.error(e)
        console.log('ERROR remove', parentNode, removedNodes[childKey])
      }

    })
  }
}

class Component {
  constructor(props) {
    this.props = props
    this._domNode = null
    this._currentElement = null
    this._renderedElement = null
    this._renderedChildren = null
  }

  construct(element) {
    this._currentElement = element
  }

  mountComponent() {
    const renderedElement = this.render()
    const renderedComponent = instantiate(renderedElement)
    const markup = Reconciler.mountComponent(renderedComponent)
    this._renderedComponent = renderedComponent
    
    return markup
  }

  receiveComponent(nextElement) {
    this._currentElement = nextElement
    this.updateComponent(this._currentElement, nextElement)
  }

  updateComponent(prevElement, nextElement) {
    this.props = nextElement.props

    const prevRenderedElement = this._renderedComponent._currentElement
    const nextRenderedElement = this.render()

    if (isSameElement(prevRenderedElement, nextRenderedElement)) {
      Reconciler.receiveComponent(this._renderedComponent, nextRenderedElement)
    } else {
      Reconciler.unmountComponent(this._renderedComponent)
      const nextRenderedComponent = instantiate(nextRenderedElement)
      const nextMarkup = Reconciler.mountComponent(nextRenderedComponent)
      DOM.replaceNode(this._renderedComponent._domNode, nextMarkup)
      this._renderedComponent = nextRenderedComponent
    }
  }
}

Component.prototype.isComponent = true

export {Component, DOMComponent, DOMTextComponent, isComponentClass}
