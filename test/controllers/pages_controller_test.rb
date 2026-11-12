require "test_helper"

class PagesControllerTest < ActionDispatch::IntegrationTest
  test "root serves the React mount" do
    get root_path
    assert_response :success
    assert_select "#root"
  end

  test "PostgreSQL is available" do
    assert_equal 1, ActiveRecord::Base.connection.select_value("SELECT 1")
  end
end
