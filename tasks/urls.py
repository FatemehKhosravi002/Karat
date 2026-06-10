from django.urls import path

from .views import TaskDetailView, TasksListView, TaskCompletedListView, TagDetailView, TagListView

urlpatterns=[
    path("tasks/", TasksListView.as_view(), name="tasks_list_view"),
    path("tasks/<int:pk>/", TaskDetailView.as_view(), name="task_detail_view"),
    path("tasks/completed/", TaskCompletedListView.as_view(), name="task_completed_list_view"),
    path("tags/", TagListView.as_view(), name="tags_list_view"),
    path("tags/<int:pk>/", TagDetailView.as_view(), name="tags_detail_view"),
]