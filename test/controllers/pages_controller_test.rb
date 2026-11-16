require "test_helper"

class PagesControllerTest < ActionDispatch::IntegrationTest
  test "root serves the React mount" do
    get root_path
    assert_response :success
    assert_select "#root"
  end

  test "requests page serves the React mount on a direct visit" do
    get "/requests"
    assert_response :success
    assert_select "#root"
  end

  test "unknown HTML paths serve the React not-found page with a 404" do
    get "/unknown/nested"
    assert_response :not_found
    assert_select "#root"
  end

  test "API and non-HTML paths do not use the client fallback" do
    get "/api/unknown", headers: { "ACCEPT" => "text/html" }
    assert_response :not_found

    get "/unknown", headers: { "ACCEPT" => "application/json" }
    assert_response :not_found
  end

  test "PostgreSQL is available" do
    assert_equal 1, ActiveRecord::Base.connection.select_value("SELECT 1")
  end
end
