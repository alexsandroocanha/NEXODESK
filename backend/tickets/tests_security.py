from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from .models import Location, StockItem

User = get_user_model()

class SecurityPermissionTests(TestCase):
    def setUp(self):
        self.operator = User.objects.create_user(username="operator", password="test-password-strong-123")
        self.client = APIClient()
        self.client.force_authenticate(self.operator)

    def test_operator_cannot_administer_users(self):
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, 403)

    def test_operator_cannot_create_stock_item(self):
        response = self.client.post("/api/stock/items/", {
            "name": "Test item", "sku": "TEST-001", "quantity": 1,
            "minimum_quantity": 0, "unit": "unidade", "active": True
        }, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertFalse(StockItem.objects.filter(sku="TEST-001").exists())
