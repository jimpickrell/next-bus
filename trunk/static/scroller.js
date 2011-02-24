function Scroller(element) {
  var frame = this.frame = element.parentNode;
  this.element = element;
  this.startTouchY = 0;
  this.MIN_START_VELOCITY_ = 0.25;
  this.BOUNCE_BACK_TIME_ = 400;
  this.acceleration = -0.005;
  this.maxTopOffset = 50;
  this.maxBottomOffset = 50;
  this.momentumEnabled_ = true;

  this.contentStartOffset = 0;
  this.calculateSizes();
  this.animateTo(0);
  this.dragging_ = false;
  this.decerating_ = false;

  if (~navigator.userAgent.indexOf('iPhone')) {
    frame.addEventListener('touchstart', this, false);
    frame.addEventListener('touchmove', this, false);
    frame.addEventListener('touchend', this, false);
  } else {
    frame.addEventListener('mousedown', this, false);
    frame.addEventListener('mousemove', this, false);
    frame.addEventListener('mouseup', this, false);
  }

  frame.addEventListener('webkitTransitionEnd', this, false);
};

Scroller.prototype.calculateSizes = function() {
  this.contentHeight = $(this.element).height();
  this.frameHeight = $(this.frame).height();
  this.heightDiff = this.frameHeight - this.contentHeight;
};

Scroller.prototype.handleEvent = function(e) {
  switch (e.type) {
    case 'touchstart':
      this.onTouchStart(e);
      break;
    case 'mousedown':
      this.onTouchStart(e);
      break;
    case 'touchmove':
      this.onTouchMove(e);
      break;
    case 'mousemove':
      this.onTouchMove(e);
      break;
    case 'touchend':
      this.onTouchEnd(e);
      break;
    case 'mouseup':
      this.onTouchEnd(e);
      break;
    case 'webkitTransitionEnd':
      this.onTransitionEnd(e);
      break;
  }
};

Scroller.prototype.onTransitionEnd = function(e) {

};

Scroller.prototype.setMinOffset = function(offset) {

};

Scroller.prototype.setMaxOffset = function(offset) {

};

Scroller.prototype.onTouchStart = function(e) {
  if (this.contentHeight == 0) {
    this.calculateSizes();
  }

  this.stopMomentum();

  if (e.touches && e.touches.length > 1) {
    // Too many fingers
    return;
  }

  this.dragging_ = true;

  if (e.touches) {
    this.startTouchY = e.touches[0].clientY;
  } else {
    this.startTouchY = e.clientY;
  }

  this.startTime_ = e.timeStamp;
  this.contentStartOffsetY = this.contentOffsetY;
};

Scroller.prototype.onTouchMove = function(e) {
  if (this.isStopping_) {
    return;
  }

  if (this.isDragging()) {
    if (e.touches) {
      var currentY = e.touches[0].clientY;
    } else {
      var currentY = e.clientY;
    }
    var deltaY = currentY - this.startTouchY;
    var newY = deltaY + this.contentStartOffsetY;

    /*if (newY > this.maxTopOffset) {
      if (newY == deltaY) {
        console.log(newY + ' - ' + this.maxTopOffset + ' - ' + deltaY + ' - ' + this.contentStartOffsetY);
      }
      //return;
    }

    if (newY < this.heightDiff - this.maxBottomOffset - 13) {
      return;
    }*/

    this.animateTo(newY);
  }
};

Scroller.prototype.onTouchEnd = function(e) {
  if (this.isDragging()) {
    //this.dragging_ = false;
    if (this.shouldStartMomentum()) {
      this.doMomentum(e);
    } else {
      this.snapToBounds();
    }
  }
};

Scroller.prototype.momentumTo = function(offsetY) {
  this.contentOffsetY = offsetY;

  this.element.style.webkitTransition = '-webkit-transform ' + this.BOUNCE_BACK_TIME_ +
      'ms cubic-bezier(0.33, 0.66, 0.66, 1)';
  this.element.style.webkitTransform = 'translate3d(0, ' + offsetY + 'px, 0)';
};

Scroller.prototype.animateTo = function(offsetY) {
  this.contentOffsetY = offsetY;

  // We use webkit-transforms with translate3d because these animations
  // will be hardware accelerated, and therefore significantly faster
  // than changing the top value.
  this.element.style.webkitTransition = '-webkit-transform ' + this.BOUNCE_BACK_TIME_ +
      'ms cubic-bezier(0.33, 0.66, 0.66, 1)';
  this.element.style.webkitTransform = 'translate3d(0, ' + offsetY + 'px, 0)';
};

Scroller.prototype.snapToBounds = function() {
};

Scroller.prototype.isDragging = function() {
  return this.dragging_;
};

Scroller.prototype.shouldStartMomentum = function() {
  return  true;
};

Scroller.prototype.isDecelerating = function() {
  return this.decelerating_;
};

Scroller.prototype.getEndVelocity = function(e) {
  if (e.touches) {
    var clientY = e.touches[0].clientY;
  } else {
    var clientY = e.clientY;
  }

  this.endTime_ = e.timeStamp;

  var velocity = (clientY - this.startTouchY) / (this.endTime_ - this.startTime_);


  //var endOffset = this.contentStartOffsetY - e.touches[0].clientY;
  /*console.log(endOffset);*/
  return 1;
};

Scroller.prototype.doMomentum = function(e) {
  if (e.changedTouches) {
    var clientY = e.changedTouches[0].clientY;
  } else {
    var clientY = e.clientY;
  }

  this.dragging_ = false;

  if (!this.contentOffsetY) {
    return;
  }

  if (this.contentOffsetY > 0) {
    this.momentumTo(0);
    return;
  }

  if (this.contentOffsetY < this.heightDiff) {
    this.momentumTo(this.heightDiff);
    return;
  }



  // Calculate the movement properties. Implement getEndVelocity using the
  // start and end position / time.
  /*var velocity = this.getEndVelocity(e);
  var acceleration = velocity < 0 ? 0.0005 : -0.0005;
  var displacement = - (velocity * velocity) / (2 * acceleration);
  var time = - velocity / acceleration;

  // Set up the transition and execute the transform. Once you implement this
  // you will need to figure out an appropriate time to clear the transition
  // so that it doesn’t apply to subsequent scrolling.
  this.element.style.webkitTransition = '-webkit-transform ' + time +
      'ms cubic-bezier(0.33, 0.66, 0.66, 1)';

  var newY = this.contentOffsetY + displacement;
  this.contentOffsetY = newY;
  this.element.style.webkitTransform = 'translate3d(0, ' + newY + 'px, 0)';*/
};

Scroller.prototype.stopMomentum = function() {
  //if (this.isDecelerating()) {
    // Get the computed style object.
    var style = document.defaultView.getComputedStyle(this.element, null);
    // Computed the transform in a matrix object given the style.
    var transform = new WebKitCSSMatrix(style.webkitTransform);
    // Clear the active transition so it doesn’t apply to our next transform.
    this.element.style.webkitTransition = '';
    // Set the element transform to where it is right now.
    this.animateTo(transform.m42);
  //}
};
