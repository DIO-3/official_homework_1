import { createRouter, createWebHistory } from 'vue-router'
import StudentsView from '../views/StudentsView.vue'
import CoursesView from '../views/CoursesView.vue'
import EnrollmentsView from '../views/EnrollmentsView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/students' },
    { path: '/students', component: StudentsView },
    { path: '/courses', component: CoursesView },
    { path: '/enrollments', component: EnrollmentsView },
    { path: '/:pathMatch(.*)*', redirect: '/students' },
  ],
})
