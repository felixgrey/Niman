const defaultState = {
  eachPage: undefined,
  currentPage: undefined,
  totalNumber: undefined,
  nearByPages: undefined
};

export class Pagnination {
  pageCount = 0;
  pageList = [1];
  middlePageNumber = null;

  PREVIOUS_GROUP = -Math.random();
  NEXT_GROUP = Math.random();

  eachPage = 10;
  currentPage = 1;
  totalNumber = 0;
  nearByPages = 2;

  locked = false;
  destroyed = false;

  onChange(state) {}

  constructor() {}

  nextGroup() {
    this.middlePageNumber += this.nearByPages * 2;
    this.calcPageList();
    this.onChange({
      pageCount: this.pageCount,
      eachPage: this.eachPage,
      currentPage: this.currentPage,
      totalNumber: this.totalNumber
    });
  }

  previousGroup() {
    this.middlePageNumber -= this.nearByPages * 2;
    this.calcPageList();
    this.onChange({
      pageCount: this.pageCount,
      eachPage: this.eachPage,
      currentPage: this.currentPage,
      totalNumber: this.totalNumber
    });
  }

  valueType(v) {
    if (v === this.PREVIOUS_GROUP) {
      return -1;
    }

    if (v === this.NEXT_GROUP) {
      return 1;
    }

    return 0;
  }

  calcPageList() {
    let {
      nearByPages,
      middlePageNumber,
      pageCount,
      currentPage,
      PREVIOUS_GROUP,
      NEXT_GROUP,
    } = this;

    let arr;
    if (pageCount <= nearByPages + 2) {
      arr = new Array(pageCount);
      arr = arr.map((a, i) => i + 1);
    } else {
      arr = [];

      if (middlePageNumber === null) {
        middlePageNumber = this.middlePageNumber = currentPage;
      }

      let inPageListNumberStart = middlePageNumber - nearByPages;
      let inPageListNumberEnd = middlePageNumber + nearByPages;

      if (inPageListNumberStart < 1) {
        inPageListNumberStart = 1;
        middlePageNumber = this.middlePageNumber = nearByPages + 1;
        inPageListNumberEnd = middlePageNumber + nearByPages;
      }

      // 补齐缺失的上一组按钮位置
      if (inPageListNumberStart < 3 ) {
        inPageListNumberEnd += 3 - inPageListNumberStart;
      }

      if (inPageListNumberEnd > pageCount) {
        inPageListNumberEnd = pageCount;
        middlePageNumber = this.middlePageNumber = pageCount - nearByPages;
        inPageListNumberStart = middlePageNumber - nearByPages;
      }

      // 补齐缺失的下一组按钮位置
      if (inPageListNumberEnd >= pageCount - 1) {
        inPageListNumberStart -= 1;
      }
      
      if (inPageListNumberEnd >= pageCount) {
        inPageListNumberStart -= 1;
      }

      if (inPageListNumberStart > 1 ) {
        arr.push(1);
      }

      if (inPageListNumberStart > 2 ) {
        arr.push(PREVIOUS_GROUP);
      }

      for (let i = inPageListNumberStart,j = 0;i <= inPageListNumberEnd; i++, j++) {
        arr.push(inPageListNumberStart + j);
      }

      if (inPageListNumberEnd < pageCount - 1) {
        arr.push(NEXT_GROUP);
      }

      if (inPageListNumberEnd < pageCount) {
        arr.push(pageCount);
      }

    }

    this.pageList = arr;
  }

  lock() {
    if (this.destroyed) {
      return;
    }
    this.locked = true;
  }

  unlock() {
    if (this.destroyed) {
      return;
    }
    this.locked = false;
  }

  isLocked() {
    if (this.destroyed) {
      return;
    }
    return this.locked;
  }

  destroy() {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
  }

  setState(state = defaultState, emit = true) {
    if (this.destroyed) {
      return;
    }

    if (this.locked) {
      return;
    }

    let {
      totalNumber = this.totalNumber,
      eachPage = this.eachPage,
      currentPage = this.currentPage,
      nearByPages = this.nearByPages
    } = state;

    if (isNaN(currentPage) || currentPage < 1) {
      currentPage = state.currentPage = 1;
    }

    if (isNaN(eachPage) || eachPage < 1) {
      eachPage = state.eachPage = 10;
    }

    if (isNaN(totalNumber) || totalNumber < 0) {
      totalNumber = state.totalNumber = 0;
    }

    if (isNaN(nearByPages) || nearByPages < 0) {
      state.nearByPages = 2;
    }

    const pageCount = parseInt(totalNumber / eachPage + '') || 0;
    this.pageCount = totalNumber % eachPage ? pageCount + 1 : pageCount;

    if (this.pageCount === 0) {
      currentPage = 1;
      this.pageCount = 1;
    } else if (currentPage > this.pageCount) {
      currentPage = this.pageCount;
    } else if (currentPage < 1) {
      currentPage = 1;
    }

    state.currentPage = currentPage;
    this.middlePageNumber = null;
    Object.assign(this, state);
    this.calcPageList();

    if (emit) {
      this.onChange({
        pageCount: this.pageCount,
        eachPage: this.eachPage,
        currentPage: this.currentPage,
        totalNumber: this.totalNumber
      });
    }
  }

  pageTo(currentPage) {
    this.setState({
      currentPage: currentPage,
      eachPage: this.eachPage,
      totalNumber: this.totalNumber,
      nearByPages: this.nearByPages
    });
  }

  next() {
    this.pageTo(this.currentPage + 1);
  }

  previous() {
    this.pageTo(this.currentPage - 1);
  }

  toFirst() {
    this.pageTo(1);
  }

  toLast() {
    this.pageTo(this.pageCount);
  }

  isFirst() {
    if (this.destroyed) {
      return;
    }
    return this.currentPage === 0;
  }

  isLast() {
    if (this.destroyed) {
      return;
    }
    return this.currentPage === this.pageCount;
  }
}
