<template>
  <div :class="'el-select el-select--mini el-input el-input--mini' + (this.disabled ? ' is-disabled' : '')">
    <div @click="onOpen" class="el-input__inner" >
      <span v-if="multiple" >{{ '选中' + selectedValue.length + '项' }}</span>
      <span v-else>{{ optionLabel }}</span>
      <span class="el-input__suffix">
        <span class="el-input__suffix-inner">
          <i class="el-select__caret el-input__icon el-icon-search"></i>
        </span>
      </span>
    </div>
    <el-dialog :title="label" :visible="dialogVisible" :show-close="false" width="40%" :modal="true" @close="onCancel" >
      <div>
        <div class="modal-container">
          <div v-for="option in selectAbleSource" class="modal-cell" @click="onSelect(option[valueField])">
            <input :type="multiple ? 'checkbox' : 'radio'" :checked="tempSelectedValue.includes(option[valueField])" />
            <span>{{ option[labelField] }}</span>
            <div class="modal-cell-mask"></div>
          </div>
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <div style="float: left;" v-if="multiple">
          <el-button type="info" @click="onSelectNone">全不选</el-button>
          <el-button type="success" @click="onSelectAll">全 选</el-button>
        </div> 
        <el-button  @click="onCancel">取 消</el-button>
        <el-button :disabled="disabled" type="primary" @click="onOk">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  props: {
    labelField: {
      type: String,
      default: 'label'
    },
    valueField: {
      type: String,
      default: 'value'
    },
    label: {
      type: String,
      default: '选择'
    },
    source: {
      type: Array,
      default: []
    },
    multiple: {
      type: Boolean,
      defaule: false
    },
    searchAble: {
      type: Boolean,
      defaule: false
    },
    doSearch: {
      type: Function,
      defaule: null
    },
    value: {
      type: [String, Number, Array],
      defaule: null
    },
    disabled: {
      type: Boolean,
      defaule: false
    }
  },
  methods: {
    syncData(){
      
      this.selectedValue = [].concat(this.value);

      if (!this.searchAble) {
        this.selectAbleSource = this.source;
      }
      
      if (!this.multiple) {
        const value = this.selectedValue[0];
        
        if (value !== undefined) {
          const t = this.selectAbleSource.filter(op =>  op[this.valueField] === value);
          if (t.length) {
            this.optionLabel = t[0][this.labelField];
          } else {
            this.optionLabel = value;
          }
        }
      }

    },
    onOpen() {
      if (this.disabled){
        return;
      }
      
      this.tempSelectedValue = [].concat(this.selectedValue);
      this.dialogVisible = true;
    },
    onCancel() {
      this.dialogVisible = false;
    },
    onOk() {
      this.selectedValue =  [].concat(this.tempSelectedValue);
      this.dialogVisible = false;
      
      let value = this.selectedValue;
      
      if (!this.multiple) {
        value = value[0];
      }

      this.$emit('input', value);
      this.$emit('change', value);
    },
    onSelect(v) {
      
      if (!this.multiple) {
        this.tempSelectedValue = [v];
        return;
      }
      
      const index = this.tempSelectedValue.indexOf(v);
      if (index !== -1) {
        this.tempSelectedValue.splice(index, 1);
      } else {
        this.tempSelectedValue.push(v);
      }
    },
    onSelectAll() {
      if (!this.multiple) {
        return;
      }
      
      this.selectAbleSource.forEach(option => {
        const v = option[this.valueField];
        const index = this.tempSelectedValue.indexOf(v);
        if (index === -1) {
           this.tempSelectedValue.push(v);
        }
      });
    },
    onSelectNone() {
      this.tempSelectedValue = [];
    }
  },
  created() {
    this.syncData();
  },
  beforeUpdate(){
    this.syncData();
  },
  data() {
    return {
      optionLabel: '',
      dialogVisible: false,
      searchedSource: [],
      selectAbleSource: [],
      tempSelectedValue: [],
      selectedValue: []
    };
  }
};
</script>

<style>
.modal-container {
  display: block;
  overflow: auto;
}

.modal-cell {
  display: inline-block;
  position: relative;
  min-width: 50%;
  height: 40px;
  line-height: 40px;
  padding-left: 20px;
}

.modal-cell-mask {
  position: absolute;
  width: 100%;
  height: 100%;
  cursor: pointer;
  top:0;
  left: 0;
}

.modal-cell-mask:hover{
  background: rgba(0,0,255,0.1);
}

</style>
