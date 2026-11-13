Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/*
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest

  root "pages#index"

  # Render the React not-found page for unknown HTML paths; keep API and asset 404s.
  get "*path", to: "pages#not_found", constraints: lambda { |request|
    request.format.html? && !request.path.match?(%r{\A/api(?:/|\z)})
  }
end
