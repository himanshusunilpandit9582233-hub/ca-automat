#!/usr/bin/env python3
"""
CA Automation Backend API Testing
Tests all authentication and onboarding endpoints with 32-bit bitmask system
"""

import requests
import sys
import json
from datetime import datetime
import random
import string

class CAAutomationTester:
    def __init__(self, base_url="https://ca-onboard-api.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.access_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", expected_status=None, actual_status=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
            if expected_status and actual_status:
                print(f"   Expected status: {expected_status}, Got: {actual_status}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "expected_status": expected_status,
            "actual_status": actual_status
        })

    def make_request(self, method, endpoint, data=None, expected_status=200, use_auth=True):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = {}
        
        if use_auth and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            
            return response
        except Exception as e:
            print(f"Request failed: {str(e)}")
            return None

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        response = self.make_request('GET', '/api/', use_auth=False)
        if response and response.status_code == 200:
            self.log_test("Root API endpoint", True)
        else:
            self.log_test("Root API endpoint", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test health endpoint
        response = self.make_request('GET', '/api/health', use_auth=False)
        if response and response.status_code == 200:
            self.log_test("Health check endpoint", True)
        else:
            self.log_test("Health check endpoint", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test onboarding flows endpoint
        response = self.make_request('GET', '/api/onboarding-flows', use_auth=False)
        if response and response.status_code == 200:
            data = response.json()
            if 'flows' in data and 'bit_mapping' in data:
                self.log_test("Onboarding flows endpoint", True)
                print(f"   Available flows: {list(data['flows'].keys())}")
                print(f"   Bit mapping: {data['bit_mapping']}")
            else:
                self.log_test("Onboarding flows endpoint", False, "Missing flows or bit_mapping")
        else:
            self.log_test("Onboarding flows endpoint", False, f"Status: {response.status_code if response else 'No response'}")

    def test_user_registration(self):
        """Test user registration"""
        print("\n🔍 Testing User Registration...")
        
        # Generate unique test user
        timestamp = datetime.now().strftime("%H%M%S")
        test_email = f"test_user_{timestamp}@example.com"
        test_password = "TestPass123!"
        test_name = f"Test User {timestamp}"
        
        registration_data = {
            "email": test_email,
            "password": test_password,
            "name": test_name,
            "phone": "+91 9876543210"
        }
        
        response = self.make_request('POST', '/api/auth/register', registration_data, use_auth=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'access_token' in data and 'id' in data:
                self.access_token = data['access_token']
                self.user_id = data['id']
                self.test_email = test_email
                self.test_password = test_password
                self.log_test("User registration", True)
                print(f"   User ID: {self.user_id}")
                print(f"   Email: {test_email}")
            else:
                self.log_test("User registration", False, "Missing access_token or id in response")
        else:
            self.log_test("User registration", False, f"Status: {response.status_code if response else 'No response'}")
            return False
        
        return True

    def test_user_login(self):
        """Test user login"""
        print("\n🔍 Testing User Login...")
        
        if not hasattr(self, 'test_email'):
            self.log_test("User login", False, "No test user available")
            return False
        
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        response = self.make_request('POST', '/api/auth/login', login_data, use_auth=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'access_token' in data:
                self.access_token = data['access_token']
                self.log_test("User login", True)
            else:
                self.log_test("User login", False, "Missing access_token in response")
        else:
            self.log_test("User login", False, f"Status: {response.status_code if response else 'No response'}")
            return False
        
        return True

    def test_auth_me(self):
        """Test get current user endpoint"""
        print("\n🔍 Testing Auth Me Endpoint...")
        
        response = self.make_request('GET', '/api/auth/me')
        
        if response and response.status_code == 200:
            data = response.json()
            if 'id' in data and 'email' in data:
                self.log_test("Get current user", True)
                print(f"   User: {data.get('name')} ({data.get('email')})")
                print(f"   Role: {data.get('role', 'Not selected')}")
            else:
                self.log_test("Get current user", False, "Missing user data")
        else:
            self.log_test("Get current user", False, f"Status: {response.status_code if response else 'No response'}")

    def test_role_selection(self):
        """Test role selection for all entity types"""
        print("\n🔍 Testing Role Selection...")
        
        roles = ['individual', 'sole_proprietor', 'opc', 'pvt_ltd']
        
        for role in roles:
            role_data = {"role": role}
            response = self.make_request('POST', '/api/onboarding/select-role', role_data)
            
            if response and response.status_code == 200:
                self.log_test(f"Role selection - {role}", True)
                self.selected_role = role
                break  # Use first successful role for further testing
            else:
                self.log_test(f"Role selection - {role}", False, f"Status: {response.status_code if response else 'No response'}")
        
        return hasattr(self, 'selected_role')

    def test_onboarding_status(self):
        """Test onboarding status endpoint"""
        print("\n🔍 Testing Onboarding Status...")
        
        response = self.make_request('GET', '/api/onboarding/status')
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ['user_id', 'status_code', 'status_binary', 'status_breakdown', 'role', 'required_steps', 'completed_steps', 'pending_steps', 'progress_percentage']
            
            missing_fields = [field for field in required_fields if field not in data]
            if not missing_fields:
                self.log_test("Onboarding status", True)
                print(f"   Status Code: {data['status_code']}")
                print(f"   Binary: {data['status_binary']}")
                print(f"   Progress: {data['progress_percentage']}%")
                print(f"   Required Steps: {data['required_steps']}")
                print(f"   Completed: {data['completed_steps']}")
                print(f"   Pending: {data['pending_steps']}")
                self.current_status = data
            else:
                self.log_test("Onboarding status", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("Onboarding status", False, f"Status: {response.status_code if response else 'No response'}")

    def test_pan_verification(self):
        """Test PAN verification endpoint"""
        print("\n🔍 Testing PAN Verification...")
        
        pan_data = {"pan": "ABCDE1234F"}
        response = self.make_request('POST', '/api/onboarding/pan-verify', pan_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'status_code' in data and 'status_binary' in data:
                self.log_test("PAN verification", True)
                print(f"   New Status Code: {data['status_code']}")
                print(f"   Binary: {data['status_binary']}")
                
                # Verify bit 1 (PAN_VERIFIED) is set
                if data['status_code'] & 1:
                    self.log_test("PAN bit verification", True)
                else:
                    self.log_test("PAN bit verification", False, "PAN bit not set in status code")
            else:
                self.log_test("PAN verification", False, "Missing status_code or status_binary")
        else:
            self.log_test("PAN verification", False, f"Status: {response.status_code if response else 'No response'}")

    def test_gstin_verification(self):
        """Test GSTIN verification endpoint"""
        print("\n🔍 Testing GSTIN Verification...")
        
        gstin_data = {"gstin": "22AAAAA0000A1Z5"}
        response = self.make_request('POST', '/api/onboarding/gstin-verify', gstin_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'status_code' in data and 'status_binary' in data:
                self.log_test("GSTIN verification", True)
                print(f"   New Status Code: {data['status_code']}")
                print(f"   Binary: {data['status_binary']}")
                
                # Verify bit 2 (GST_VERIFIED) is set
                if data['status_code'] & 2:
                    self.log_test("GST bit verification", True)
                else:
                    self.log_test("GST bit verification", False, "GST bit not set in status code")
            else:
                self.log_test("GSTIN verification", False, "Missing status_code or status_binary")
        else:
            self.log_test("GSTIN verification", False, f"Status: {response.status_code if response else 'No response'}")

    def test_cin_verification(self):
        """Test CIN verification endpoint"""
        print("\n🔍 Testing CIN Verification...")
        
        cin_data = {"cin": "U12345MH2020PTC123456"}
        response = self.make_request('POST', '/api/onboarding/cin-verify', cin_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'status_code' in data and 'status_binary' in data:
                self.log_test("CIN verification", True)
                print(f"   New Status Code: {data['status_code']}")
                print(f"   Binary: {data['status_binary']}")
                
                # Verify bit 4 (CIN_VERIFIED) is set
                if data['status_code'] & 4:
                    self.log_test("CIN bit verification", True)
                else:
                    self.log_test("CIN bit verification", False, "CIN bit not set in status code")
            else:
                self.log_test("CIN verification", False, "Missing status_code or status_binary")
        else:
            self.log_test("CIN verification", False, f"Status: {response.status_code if response else 'No response'}")

    def test_consent_submission(self):
        """Test consent submission endpoint"""
        print("\n🔍 Testing Consent Submission...")
        
        consent_data = {
            "general_consent": True,
            "ais_consent": True,
            "itr_consent": True
        }
        response = self.make_request('POST', '/api/onboarding/consent', consent_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'status_code' in data and 'status_binary' in data:
                self.log_test("Consent submission", True)
                print(f"   New Status Code: {data['status_code']}")
                print(f"   Binary: {data['status_binary']}")
                print(f"   Account Created: {data.get('account_created', False)}")
                
                # Verify consent bits are set
                status_code = data['status_code']
                consent_bits_set = (status_code & 8) and (status_code & 16) and (status_code & 32)  # Consent=8, AIS=16, ITR=32
                
                if consent_bits_set:
                    self.log_test("Consent bits verification", True)
                else:
                    self.log_test("Consent bits verification", False, f"Not all consent bits set. Status: {status_code}")
            else:
                self.log_test("Consent submission", False, "Missing status_code or status_binary")
        else:
            self.log_test("Consent submission", False, f"Status: {response.status_code if response else 'No response'}")

    def test_final_status_check(self):
        """Test final onboarding status after all steps"""
        print("\n🔍 Testing Final Status Check...")
        
        response = self.make_request('GET', '/api/onboarding/status')
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Final status check", True)
            print(f"   Final Status Code: {data['status_code']}")
            print(f"   Binary: {data['status_binary']}")
            print(f"   Progress: {data['progress_percentage']}%")
            print(f"   Status Breakdown: {data['status_breakdown']}")
            
            # Check if account was created (bit 64)
            if data['status_code'] & 64:
                self.log_test("Account creation verification", True)
            else:
                self.log_test("Account creation verification", False, "Account bit (64) not set")
                
        else:
            self.log_test("Final status check", False, f"Status: {response.status_code if response else 'No response'}")

    def test_logout(self):
        """Test user logout"""
        print("\n🔍 Testing User Logout...")
        
        response = self.make_request('POST', '/api/auth/logout', {})
        
        if response and response.status_code == 200:
            self.log_test("User logout", True)
            self.access_token = None
        else:
            self.log_test("User logout", False, f"Status: {response.status_code if response else 'No response'}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting CA Automation Backend API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        self.test_health_check()
        
        if self.test_user_registration():
            self.test_auth_me()
            
            if self.test_role_selection():
                self.test_onboarding_status()
                
                # Test verification endpoints based on selected role
                if hasattr(self, 'selected_role'):
                    if self.selected_role in ['individual', 'sole_proprietor', 'opc', 'pvt_ltd']:
                        self.test_pan_verification()
                    
                    if self.selected_role in ['sole_proprietor', 'pvt_ltd']:
                        self.test_gstin_verification()
                    
                    if self.selected_role in ['opc', 'pvt_ltd']:
                        self.test_cin_verification()
                    
                    self.test_consent_submission()
                    self.test_final_status_check()
            
            self.test_logout()
        
        # Test login with existing user
        if hasattr(self, 'test_email'):
            self.test_user_login()
        
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   - {test['name']}: {test['details']}")
        
        print("\n🎯 32-Bit Bitmask System Verification:")
        print("   PAN=1, GST=2, CIN=4, Consent=8, AIS=16, ITR=32, Account=64")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = CAAutomationTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())