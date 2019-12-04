import PouchDB from 'pouchdb-node';
import PouchVue from '../src/index'
import lf from 'pouchdb-find';
import plf from 'pouchdb-live-find';

// vue-test-utils
import { createLocalVue, mount } from '@vue/test-utils'

// import test vue single file components
import emptyDataFunction from './emptyDataFunction.vue'
import emptyDataObject from './emptyDataObject.vue'
import noData from './noDataFunctionOrObject.vue'
import existingData from './ExistingTodosDataFunction.vue'
import todosDataWithSelector from './TodosDataFunctionWithSelector.vue'

describe('Pouch options are returned by function', () => {
  describe('Unit Tests that todos is defined on Vue components', () => {
    var testDatum = [
      { name: 'Test Plugin with Empty Data Function', component: emptyDataFunction },
      { name: 'Test Plugin with Empty Data Object', component: emptyDataObject },
      { name: 'Test Plugin with No Data Function Or Object', component: noData },
      { name: 'Test Plugin with Existing Data Function', component: existingData }
    ];

    for (var i = 0; i < testDatum.length; i++) {


      let tryTestData = testDatum[i].component;
      let tryTestName = testDatum[i].name;

      function testFunc() {
        const localVue = createLocalVue()

        // add requisite PouchDB plugins
        PouchDB.plugin(lf);
        PouchDB.plugin(plf);

        // add Vue.js plugin
        localVue.use(PouchVue, {
          pouch: PouchDB,
          defaultDB: 'farfromhere',
        });


        const wrapper = mount(tryTestData, {
          localVue,
          pouch() {
            return {
              todos: {/*empty selector*/ }
            }
          }
        })

        expect(wrapper.vm.$data.todos).not.toBeUndefined();
      }
      test(tryTestName, testFunc);
    }
  })

  describe('Unit Tests to see that the todos property on the data root level is connected with the todos property on the vue instance (this is what the beforeCreate lifecycle hook does)', () => {
    var testDatum = [
      { name: 'Test Plugin with Empty Data Function', component: emptyDataFunction },
      { name: 'Test Plugin with Empty Data Object', component: emptyDataObject },
      { name: 'Test Plugin with No Data Function Or Object', component: noData },
      { name: 'Test Plugin with Existing Data Function', component: existingData }
    ];

    for (var i = 0; i < testDatum.length; i++) {


      let tryTestData = testDatum[i].component;
      let tryTestName = testDatum[i].name;

      function testFunc() {
        const localVue = createLocalVue()

        // add requisite PouchDB plugins
        PouchDB.plugin(lf);
        PouchDB.plugin(plf);

        // add Vue.js plugin
        localVue.use(PouchVue, {
          pouch: PouchDB,
          defaultDB: 'farfromhere',
        });


        const wrapper = mount(tryTestData, {
          localVue,
          pouch() {
            return {
              todos: {/*empty selector*/ }
            }
          }
        })

        wrapper.vm.todos = ['north', 'east', 'south', 'west'];

        expect(wrapper.vm.$data.todos).toBe(wrapper.vm.todos);

      }
      test(tryTestName, testFunc);
    }

  })
})

describe('Pouch options are objects', () => {
  describe('Unit Tests that todos is defined on Vue components', () => {
    var testDatum = [
      { name: 'Test Plugin with Empty Data Function', component: emptyDataFunction },
      { name: 'Test Plugin with Empty Data Object', component: emptyDataObject },
      { name: 'Test Plugin with No Data Function Or Object', component: noData },
      { name: 'Test Plugin with Existing Data Function', component: existingData }
    ];

    for (var i = 0; i < testDatum.length; i++) {


      let tryTestData = testDatum[i].component;
      let tryTestName = testDatum[i].name;

      function testFunc() {
        const localVue = createLocalVue()

        // add requisite PouchDB plugins
        PouchDB.plugin(lf);
        PouchDB.plugin(plf);

        // add Vue.js plugin
        localVue.use(PouchVue, {
          pouch: PouchDB,
          defaultDB: 'farfromhere',
        });


        const wrapper = mount(tryTestData, {
          localVue,
          pouch: {
            todos: {/*empty selector*/ }
          }
        })

        expect(wrapper.vm.$data.todos).not.toBeUndefined();
      }
      test(tryTestName, testFunc);
    }
  })

  describe('Unit Tests to see that the todos property on the data root level is connected with the todos property on the vue instance (this is what the beforeCreate lifecycle hook does)', () => {
    var testDatum = [
      { name: 'Test Plugin with Empty Data Function', component: emptyDataFunction },
      { name: 'Test Plugin with Empty Data Object', component: emptyDataObject },
      { name: 'Test Plugin with No Data Function Or Object', component: noData },
      { name: 'Test Plugin with Existing Data Function', component: existingData }
    ];

    for (var i = 0; i < testDatum.length; i++) {


      let tryTestData = testDatum[i].component;
      let tryTestName = testDatum[i].name;

      function testFunc() {
        const localVue = createLocalVue()

        // add requisite PouchDB plugins
        PouchDB.plugin(lf);
        PouchDB.plugin(plf);

        // add Vue.js plugin
        localVue.use(PouchVue, {
          pouch: PouchDB,
          defaultDB: 'farfromhere',
        });


        const wrapper = mount(tryTestData, {
          localVue,
          pouch: {
            todos: {/*empty selector*/ }
          }
        })

        wrapper.vm.todos = ['north', 'east', 'south', 'west'];

        expect(wrapper.vm.$data.todos).toBe(wrapper.vm.todos);

      }
      test(tryTestName, testFunc);
    }

  })
})
describe('Set selector to null', () => {
    var testDatum = [
      { name: 'Test Plugin with Reactive Selector that can return null', component: todosDataWithSelector },
    ];

    for (var i = 0; i < testDatum.length; i++) {


      let tryTestData = testDatum[i].component;
      let tryTestName = testDatum[i].name;

      // selector will return null if the age is less than the max age
      // purely to get a reactive selector that will return null occasionally and
      // trip up the watcher on the pouch database config options
      let selector = function () { return (this.age < this.maxAge) ? null : {} }

      function testFunc(done) {
        const localVue = createLocalVue()

        // add requisite PouchDB plugins
        PouchDB.plugin(lf);
        PouchDB.plugin(plf);

        // add Vue.js plugin
        localVue.use(PouchVue, {
          pouch: PouchDB,
          defaultDB: 'farfromhere',
        });


        const wrapper = mount(tryTestData, {
          localVue,
          pouch: {
            todos: selector
          }
        })

        wrapper.vm.todos = ['north', 'east', 'south', 'west'];

        wrapper.vm.maxAge = 50;
          
        //watchers are deferred to the next update cycle that Vue uses to look for changes.
        //the change to the selector has a watcher on it in pouch-vue
        wrapper.vm.$nextTick(() => {  
          expect(wrapper.emitted('pouchdb-livefeed-error')).toHaveLength(1);
          done();
        });            
      }
      test(tryTestName, testFunc);
    }
})
