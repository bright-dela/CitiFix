from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_verification_document, name='upload_document'),
    path('my-documents/', views.get_my_documents, name='my_documents'),
    path('<uuid:document_id>/', views.delete_document, name='delete_document'),
]