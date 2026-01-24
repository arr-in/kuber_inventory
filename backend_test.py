#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime
import uuid

class KuberInventoryAPITester:
    def __init__(self, base_url="https://jewel-track-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {
            'categories': [],
            'products': [],
            'admins': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # Remove content-type for file uploads
                    headers.pop('Content-Type', None)
                    response = requests.post(url, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"   ✅ Passed - Status: {response.status_code}")
                try:
                    result = response.json()
                    if 'id' in result:
                        print(f"   📝 Created ID: {result['id']}")
                    return True, result
                except:
                    return True, {}
            else:
                print(f"   ❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_msg = response.json().get('detail', 'No error message')
                    print(f"   🔍 Error: {error_msg}")
                except:
                    print(f"   🔍 Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"   ❌ Failed - Exception: {str(e)}")
            return False, {}

    # Authentication Tests
    def test_register_admin(self):
        """Test admin registration"""
        test_email = f"test_admin_{datetime.now().strftime('%H%M%S')}@kuber.com"
        success, response = self.run_test(
            "Register New Admin",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "TestPass123!",
                "name": "Test Admin",
                "role": "admin"
            }
        )
        if success:
            self.created_ids['admins'].append(test_email)
        return success

    def test_login_valid(self):
        """Test login with valid credentials"""
        success, response = self.run_test(
            "Login (Valid Credentials)",
            "POST",
            "auth/login",
            200,
            data={
                "email": "admin@kuber.com",
                "password": "admin123"
            }
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   🔑 Token obtained successfully")
            return True
        return False

    def test_login_invalid(self):
        """Test login with invalid credentials"""
        success, _ = self.run_test(
            "Login (Invalid Credentials)",
            "POST",
            "auth/login",
            401,
            data={
                "email": "admin@kuber.com",
                "password": "wrongpassword"
            }
        )
        return success

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    # Category Tests
    def test_create_category(self):
        """Test creating a category"""
        success, response = self.run_test(
            "Create Category",
            "POST",
            "categories",
            200,
            data={
                "name": f"Test Category {datetime.now().strftime('%H%M%S')}",
                "description": "Test category description"
            }
        )
        if success and 'id' in response:
            self.created_ids['categories'].append(response['id'])
        return success

    def test_get_categories(self):
        """Test getting all categories"""
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "categories",
            200
        )
        if success and isinstance(response, list):
            print(f"   📊 Found {len(response)} categories")
        return success

    # Product Tests
    def test_create_product(self):
        """Test creating a product"""
        success, response = self.run_test(
            "Create Product",
            "POST",
            "products",
            200,
            data={
                "name": f"Test Product {datetime.now().strftime('%H%M%S')}",
                "sku": f"TEST-{datetime.now().strftime('%H%M%S')}",
                "description": "Test product description",
                "price": 1500.00,
                "quantity": 25,
                "category": "Jewellery",
                "low_stock_threshold": 10,
                "images": []
            }
        )
        if success and 'id' in response:
            self.created_ids['products'].append(response['id'])
        return success

    def test_get_products(self):
        """Test getting all products"""
        success, response = self.run_test(
            "Get Products",
            "GET",
            "products",
            200
        )
        if success and isinstance(response, list):
            print(f"   📊 Found {len(response)} products")
        return success

    def test_search_products(self):
        """Test searching products"""
        success, response = self.run_test(
            "Search Products (by name)",
            "GET",
            "products?search=Gold",
            200
        )
        return success

    def test_filter_products_by_category(self):
        """Test filtering products by category"""
        success, response = self.run_test(
            "Filter Products (by category)",
            "GET",
            "products?category=Jewellery",
            200
        )
        return success

    def test_low_stock_filter(self):
        """Test low stock filter"""
        success, response = self.run_test(
            "Filter Low Stock Products",
            "GET",
            "products?low_stock=true",
            200
        )
        return success

    def test_update_product(self):
        """Test updating a product"""
        if not self.created_ids['products']:
            print("   ⚠️  No products created to test update")
            return False
        
        product_id = self.created_ids['products'][0]
        success, response = self.run_test(
            "Update Product",
            "PUT",
            f"products/{product_id}",
            200,
            data={
                "quantity": 50,
                "price": 2000.00
            }
        )
        return success

    def test_get_single_product(self):
        """Test getting a single product"""
        if not self.created_ids['products']:
            print("   ⚠️  No products created to test get")
            return False
        
        product_id = self.created_ids['products'][0]
        success, response = self.run_test(
            "Get Single Product",
            "GET",
            f"products/{product_id}",
            200
        )
        return success

    # Stats and Reports Tests
    def test_get_stats(self):
        """Test getting dashboard stats"""
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "stats",
            200
        )
        if success:
            stats = ['total_products', 'total_stock_value', 'low_stock_items', 'total_categories']
            for stat in stats:
                if stat in response:
                    print(f"   📊 {stat}: {response[stat]}")
        return success

    def test_get_low_stock_report(self):
        """Test low stock report"""
        success, response = self.run_test(
            "Get Low Stock Report",
            "GET",
            "reports/low-stock",
            200
        )
        return success

    def test_get_activity_logs(self):
        """Test activity logs"""
        success, response = self.run_test(
            "Get Activity Logs",
            "GET",
            "reports/activity-logs",
            200
        )
        if success and isinstance(response, list):
            print(f"   📊 Found {len(response)} activity logs")
        return success

    def test_get_inventory_report(self):
        """Test inventory report"""
        success, response = self.run_test(
            "Get Inventory Report",
            "GET",
            "reports/inventory",
            200
        )
        return success

    def test_get_admins(self):
        """Test getting all admins"""
        success, response = self.run_test(
            "Get All Admins",
            "GET",
            "admins",
            200
        )
        if success and isinstance(response, list):
            print(f"   📊 Found {len(response)} admins")
        return success

    # Cleanup Tests
    def cleanup_created_resources(self):
        """Cleanup created test resources"""
        print("\n🧹 Cleaning up test resources...")
        
        # Delete created products
        for product_id in self.created_ids['products']:
            self.run_test(
                f"Delete Product {product_id[:8]}...",
                "DELETE",
                f"products/{product_id}",
                200
            )
        
        # Delete created categories
        for category_id in self.created_ids['categories']:
            self.run_test(
                f"Delete Category {category_id[:8]}...",
                "DELETE",
                f"categories/{category_id}",
                200
            )

    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"🚀 Starting Kuber Inventory Management API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("="*60)

        # Authentication Flow
        print("\n📋 AUTHENTICATION TESTS")
        self.test_register_admin()
        
        if not self.test_login_valid():
            print("❌ Login failed - stopping tests")
            return False
        
        self.test_login_invalid()
        self.test_get_current_user()

        # Category Tests
        print("\n📋 CATEGORY TESTS")
        self.test_create_category()
        self.test_get_categories()

        # Product Tests
        print("\n📋 PRODUCT TESTS")
        self.test_create_product()
        self.test_get_products()
        self.test_search_products()
        self.test_filter_products_by_category()
        self.test_low_stock_filter()
        self.test_update_product()
        self.test_get_single_product()

        # Reports and Stats
        print("\n📋 REPORTS & STATS TESTS")
        self.test_get_stats()
        self.test_get_low_stock_report()
        self.test_get_activity_logs()
        self.test_get_inventory_report()

        # Admin Management
        print("\n📋 ADMIN MANAGEMENT TESTS")
        self.test_get_admins()

        # Cleanup
        self.cleanup_created_resources()

        # Results
        print("\n" + "="*60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = KuberInventoryAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())